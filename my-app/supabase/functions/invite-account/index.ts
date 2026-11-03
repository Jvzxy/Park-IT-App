import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type InvitationRole = "student" | "guard" | "admin";

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Account invitation is missing Supabase function secrets.");
    return jsonResponse({ error: "Invitations are temporarily unavailable." }, 500);
  }

  const authorization = request.headers.get("Authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return jsonResponse({ error: "Administrator sign-in is required." }, 401);

  const caller = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: authData, error: authError } = await caller.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return jsonResponse({ error: "Administrator sign-in is required." }, 401);
  }

  const { data: profile, error: profileError } = await caller
    .from("users")
    .select("role, is_active")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Invitation role lookup failed:", profileError.message);
    return jsonResponse({ error: "Unable to verify administrator access." }, 500);
  }
  if (profile?.role !== "admin" || !profile.is_active) {
    return jsonResponse({ error: "Administrator access is required." }, 403);
  }

  let payload: { email?: unknown; role?: unknown; student_id?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request." }, 400);
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const role = payload.role as InvitationRole;
  const studentId = typeof payload.student_id === "string" ? payload.student_id.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: "Enter a valid email address." }, 400);
  }
  if (!["student", "guard", "admin"].includes(role)) {
    return jsonResponse({ error: "Choose a valid account role." }, 400);
  }
  if ((role === "student" && !/^\d{6,20}$/.test(studentId)) ||
      (role !== "student" && studentId.length > 0)) {
    return jsonResponse({ error: "Enter a Student ID only for student invitations." }, 400);
  }
  const redirectTo = role === "student" ? null : Deno.env.get("INVITE_REDIRECT_URL");
  if (role !== "student" && !redirectTo) {
    console.error("Account invitation is missing INVITE_REDIRECT_URL.");
    return jsonResponse({ error: "Invitations are temporarily unavailable." }, 500);
  }

  const { data: existingInvitation, error: lookupError } = await caller
    .from("account_invitations")
    .select("id, role, student_id")
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();
  if (lookupError) {
    console.error("Pending invitation lookup failed:", lookupError.message);
    return jsonResponse({ error: "Could not check existing invitations." }, 500);
  }

  let invitationId: string;
  let createdInvitation = false;
  if (existingInvitation) {
    if (existingInvitation.role !== role ||
        existingInvitation.student_id !== (role === "student" ? studentId : null)) {
      return jsonResponse(
        { error: "A pending invitation already exists with different account details." },
        409,
      );
    }
    invitationId = existingInvitation.id;
  } else {
    const { data, error: invitationError } = await caller.rpc(
      "create_account_invitation",
      {
        p_email: email,
        p_role: role,
        p_student_id: role === "student" ? studentId : null,
      },
    );
    if (invitationError || !data) {
      return jsonResponse(
        { error: invitationError?.message ?? "Could not create the invitation." },
        400,
      );
    }
    invitationId = data;
    createdInvitation = true;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (role === "student") {
    if (!createdInvitation) {
      const { error: logError } = await admin.from("activity_logs").insert({
        user_id: authData.user.id,
        action: "student_signup_invitation_created",
        details: { invitation_id: invitationId },
      });
      if (logError) console.error("Failed to record student invitation activity:", logError.message);
    }
    return jsonResponse({ invitation_id: invitationId, email_sent: false });
  }

  if (!redirectTo) {
    console.error("Staff invitation redirect URL is not configured.");
    return jsonResponse({ error: "Invitations are temporarily unavailable." }, 500);
  }

  const { error: sendError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {},
    redirectTo,
  });
  if (sendError) {
    if (createdInvitation) {
      const { error: revokeError } = await admin
        .from("account_invitations")
        .update({ status: "revoked" })
        .eq("id", invitationId)
        .eq("status", "pending");
      if (revokeError) console.error("Failed to revoke unsent invitation:", revokeError.message);
    }
    console.error("Invitation email could not be sent:", sendError.message);
    return jsonResponse({ error: "Could not send the invitation email." }, 502);
  }

  const { error: logError } = await admin.from("activity_logs").insert({
    user_id: authData.user.id,
    action: "account_invitation_email_sent",
    details: { invitation_id: invitationId, role },
  });
  if (logError) console.error("Failed to record invitation email activity:", logError.message);

  return jsonResponse({ invitation_id: invitationId, email_sent: true });
});
