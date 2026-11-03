import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

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
    console.error("Student login is missing Supabase function secrets.");
    return jsonResponse({ error: "Login is temporarily unavailable." }, 500);
  }

  let payload: { identifier?: unknown; password?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request." }, 400);
  }

  const studentId = typeof payload.identifier === "string" ? payload.identifier.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  if (!/^\d{6,20}$/.test(studentId) || password.length < 1 || password.length > 256) {
    return jsonResponse({ error: "Invalid Student ID or password." }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("email, role, is_active")
    .eq("student_id", studentId)
    .maybeSingle();

  if (profileError) {
    console.error("Student ID lookup failed:", profileError.message);
    return jsonResponse({ error: "Login is temporarily unavailable." }, 500);
  }
  if (!profile || profile.role !== "student" || !profile.is_active) {
    return jsonResponse({ error: "Invalid Student ID or password." }, 401);
  }

  const auth = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await auth.auth.signInWithPassword({
    email: profile.email,
    password,
  });
  if (error || !data.session) {
    return jsonResponse({ error: "Invalid Student ID or password." }, 401);
  }

  return jsonResponse({
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  });
});
