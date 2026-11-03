import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Session } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isInviteFlow =
  window.location.pathname.endsWith("/invite-accept") ||
  new URLSearchParams(window.location.hash.slice(1)).get("type") === "invite";
const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null;

type Role = "guard" | "admin";
type Page = "overview" | "zones" | "reports" | "announcements" | "accounts" | "settings" | "activity" | "profile";
type Profile = { id: string; email: string; role: Role; full_name: string | null; is_active: boolean };
type Zone = {
  id: number;
  name: string;
  description: string | null;
  capacity: number;
  current_occupancy: number;
  status: string;
  is_active: boolean;
};
type Report = {
  id: number;
  student_id: string;
  zone_id: number;
  category: string;
  description: string;
  photo_url: string | null;
  status: string;
  created_at: string;
  assigned_guard_id: string | null;
};
type Announcement = {
  id: number;
  message: string;
  audience: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
};
type Account = {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
  student_id: string | null;
  is_active: boolean;
  created_at: string;
};
type Assignment = { id: number; guard_id: string; zone_id: number };
type Invitation = { id: string; email: string; role: string; student_id: string | null; status: string; created_at: string };
type Setting = { key: string; value: unknown; updated_at: string };

const menu: { id: Page; label: string; icon: string; adminOnly?: boolean }[] = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "zones", label: "Parking zones", icon: "▦" },
  { id: "reports", label: "Reports", icon: "◉" },
  { id: "announcements", label: "Announcements", icon: "▤" },
  { id: "accounts", label: "Accounts", icon: "♙", adminOnly: true },
  { id: "settings", label: "System settings", icon: "⚙", adminOnly: true },
  { id: "activity", label: "Activity log", icon: "◷", adminOnly: true },
  { id: "profile", label: "My profile", icon: "♧" },
];

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function downloadCsv(filename: string, rows: (string | number | null)[][]): void {
  const escapeCell = (value: string | number | null) => {
    let text = String(value ?? "");
    if (/^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const csv = rows
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(isInviteFlow);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [page, setPage] = useState<Page>("overview");
  const [notice, setNotice] = useState("");
  const [noticeIsSuccess, setNoticeIsSuccess] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [activity, setActivity] = useState<{ id: number; user_id: string | null; action: string; details: Record<string, unknown>; created_at: string }[]>([]);

  const loadProfile = useCallback(async (nextSession: Session | null) => {
    if (!supabase) return;
    setSession(nextSession);
    if (!nextSession) {
      setProfile(null);
      setNeedsPasswordSetup(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("id, email, role, full_name, is_active")
      .eq("id", nextSession.user.id)
      .maybeSingle();
    if (error) {
      setNotice(`Could not load your account: ${error.message}`);
      setProfile(null);
      setLoading(false);
      return;
    }
    if (!data || !data.is_active || !["guard", "admin"].includes(data.role)) {
      setNotice("This portal is for active guard and administrator accounts.");
      setProfile(null);
      setLoading(false);
      await supabase.auth.signOut();
      return;
    }
    setProfile(data as Profile);
    setPage("overview");
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setNotice(`Could not restore your session: ${error.message}`);
      void loadProfile(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => {
        if (active) void loadProfile(nextSession);
      }, 0);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshWorkspace = useCallback(async () => {
    if (!supabase || !profile) return;
    const [zonesResult, reportsResult, announcementsResult] = await Promise.all([
      supabase.from("parking_zones").select("id, name, description, capacity, current_occupancy, status, is_active").order("name"),
      supabase.from("parking_reports").select("id, student_id, zone_id, category, description, photo_url, status, created_at, assigned_guard_id").order("created_at", { ascending: false }).limit(500),
      supabase.from("announcements").select("id, message, audience, is_active, expires_at, created_at").order("created_at", { ascending: false }).limit(100),
    ]);
    if (zonesResult.error) throw zonesResult.error;
    if (reportsResult.error) throw reportsResult.error;
    if (announcementsResult.error) throw announcementsResult.error;
    setZones((zonesResult.data ?? []) as Zone[]);
    setReports((reportsResult.data ?? []) as Report[]);
    setAnnouncements((announcementsResult.data ?? []) as Announcement[]);

    if (profile.role === "admin") {
      const [accountsResult, assignmentsResult, invitationsResult, settingsResult, activityResult] = await Promise.all([
        supabase.from("users").select("id, email, role, full_name, student_id, is_active, created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("guard_assignments").select("id, guard_id, zone_id").order("created_at", { ascending: false }),
        supabase.from("account_invitations").select("id, email, role, student_id, status, created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("system_settings").select("key, value, updated_at").order("key"),
        supabase.from("activity_logs").select("id, user_id, action, details, created_at").order("created_at", { ascending: false }).limit(200),
      ]);
      const error = accountsResult.error ?? assignmentsResult.error ?? invitationsResult.error ?? settingsResult.error ?? activityResult.error;
      if (error) throw error;
      setAccounts((accountsResult.data ?? []) as Account[]);
      setAssignments((assignmentsResult.data ?? []) as Assignment[]);
      setInvitations((invitationsResult.data ?? []) as Invitation[]);
      setSettings((settingsResult.data ?? []) as Setting[]);
      setActivity((activityResult.data ?? []) as typeof activity);
    } else {
      const { data, error } = await supabase
        .from("guard_assignments")
        .select("id, guard_id, zone_id")
        .eq("guard_id", profile.id);
      if (error) throw error;
      setAssignments((data ?? []) as Assignment[]);
      setAccounts([]);
      setInvitations([]);
      setSettings([]);
      setActivity([]);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    void refreshWorkspace().catch((error: unknown) => setNotice(`Could not load portal data: ${messageOf(error)}`));
  }, [profile, refreshWorkspace]);

  const visibleMenu = useMemo(
    () => menu.filter((item) => !item.adminOnly || profile?.role === "admin"),
    [profile],
  );
  const zoneNames = useMemo(() => new Map(zones.map((zone) => [zone.id, zone.name])), [zones]);
  const activeReports = reports.filter((report) => report.status !== "Resolved" && report.status !== "Rejected").length;

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setSubmitting(true);
    setNotice("");
    setNoticeIsSuccess(false);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) setNotice(error.message);
    } catch (error) {
      setNotice(messageOf(error));
    } finally {
      setSubmitting(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!supabase) return;

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setNotice("Enter your administrator email address first.");
      setNoticeIsSuccess(false);
      return;
    }

    setSubmitting(true);
    setNotice("");
    setNoticeIsSuccess(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/invite-accept`,
      });

      if (error) throw error;

      setNotice(
        "Password reset email sent. Open the newest email and follow its link to set your password."
      );
      setNoticeIsSuccess(true);
    } catch (error) {
      setNotice(`Password reset failed: ${messageOf(error)}`);
      setNoticeIsSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (successMessage: string, action: () => Promise<{ error: { message: string } | null }>) => {
    setNotice("");
    try {
      const { error } = await action();
      if (error) throw new Error(error.message);
      setNotice(successMessage);
      await refreshWorkspace();
    } catch (error) {
      setNotice(messageOf(error));
    }
  };

  const setOccupancy = (zoneId: number, occupancy: number) =>
    runAction("Parking occupancy updated.", async () => {
      if (!supabase) return { error: { message: "Supabase is not configured." } };
      return supabase.rpc("set_zone_occupancy", { p_zone_id: zoneId, p_occupancy: occupancy });
    });

  const updateReportStatus = (reportId: number, status: string, remark: string) =>
    runAction("Report status updated and the student has been notified.", async () => {
      if (!supabase) return { error: { message: "Supabase is not configured." } };
      return supabase.rpc("update_report_status", {
        p_report_id: reportId,
        p_status: status,
        p_remark: remark,
      });
    });

  const reviewReport = (reportId: number, action: string, duplicateOf: number | null = null) =>
    runAction("Report review saved.", async () => {
      if (!supabase) return { error: { message: "Supabase is not configured." } };
      return supabase.rpc("review_report", {
        p_report_id: reportId,
        p_action: action,
        p_remark: `Administrator marked this report as ${action}.`,
        p_duplicate_of: duplicateOf,
      });
    });

  if (!supabase) {
    return (
      <main className="setup-screen">
        <div className="setup-card">
          <div className="brand-mark">P</div>
          <h1>Connect Park-IT</h1>
          <p>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>guard-web/.env.local</code>, then restart the portal.</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return <main className="loading-screen"><span className="spinner" />Loading Park-IT…</main>;
  }

  if (session && profile && needsPasswordSetup) {
    return <InvitePasswordSetup onComplete={() => {
      setNeedsPasswordSetup(false);
      window.history.replaceState({}, "", window.location.pathname.replace(/\/invite-accept$/, "/"));
    }} />;
  }

  if (!session || !profile) {
    return (
      <main className="login-screen">
        <form className="login-card" onSubmit={submitLogin}>
          <div className="brand-mark">P</div>
          <p className="eyebrow">USTP-CDO PARKING SPACE</p>
          <h1>Staff portal</h1>
          <p className="muted">Sign in with your invited guard or administrator account.</p>
          {notice && <div className={`notice ${noticeIsSuccess ? "success" : "error"}`} role="status">{notice}</div>}
          <label>Email address<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="primary full" disabled={submitting}>{submitting ? "Please wait…" : "Sign in"}</button>
          <button
            type="button"
            className="text-button"
            disabled={submitting}
            onClick={() => void sendPasswordReset()}
          >
            Forgot password? Set or reset password
          </button>
          <p className="fine-print">Access is provisioned by a Park-IT administrator. Need help? Contact your system administrator.</p>
        </form>
      </main>
    );
  }

  const content = () => {
    if (page === "overview") {
      const occupancy = zones.reduce((sum, zone) => sum + zone.current_occupancy, 0);
      const capacity = zones.reduce((sum, zone) => sum + zone.capacity, 0);
      const statusCounts = ["Pending", "In Progress", "Resolved", "Rejected"].map((status) => ({
        status,
        count: reports.filter((report) => report.status === status).length,
      }));
      return (
        <>
          <div className="page-heading"><div><p className="eyebrow">PARKING OPERATIONS</p><h1>Overview</h1><p className="muted">Live campus parking and incident activity.</p></div>
            {profile.role === "admin" && <button className="secondary" onClick={() => downloadCsv("park-it-reports.csv", [["Report ID", "Zone", "Category", "Status", "Created"], ...reports.map((report) => [report.id, zoneNames.get(report.zone_id) ?? report.zone_id, report.category, report.status, report.created_at])])}>Export reports CSV</button>}
          </div>
          <div className="stat-grid">
            <Stat label="Zones online" value={`${zones.filter((zone) => zone.is_active).length}/${zones.length}`} detail="Active parking areas" />
            <Stat label="Vehicles parked" value={`${occupancy}`} detail={`of ${capacity} available spaces`} />
            <Stat label="Open reports" value={`${activeReports}`} detail="Needs staff attention" />
            <Stat label="Announcements" value={`${announcements.filter((item) => item.is_active).length}`} detail="Currently active" />
          </div>
          <div className="content-grid">
            <section className="panel"><div className="panel-heading"><h2>Zone occupancy</h2><button className="text-button" onClick={() => setPage("zones")}>Manage zones</button></div>
              {zones.length === 0 ? <Empty>No parking zones have been configured.</Empty> : zones.map((zone) => <ZoneProgress key={zone.id} zone={zone} />)}
            </section>
            <section className="panel"><div className="panel-heading"><h2>Report summary</h2><button className="text-button" onClick={() => setPage("reports")}>Review reports</button></div>
              {statusCounts.map(({ status, count }) => <div className="summary-row" key={status}><span className={`status-dot ${status.toLowerCase().replace(" ", "-")}`} />{status}<strong>{count}</strong></div>)}
            </section>
          </div>
          <section className="panel"><div className="panel-heading"><h2>Recent reports</h2><span className="muted">{reports.length} loaded</span></div><ReportTable reports={reports.slice(0, 5)} zoneNames={zoneNames} /></section>
        </>
      );
    }

    if (page === "zones") {
      return <ZonesPage zones={zones} role={profile.role} onOccupancy={setOccupancy} refresh={refreshWorkspace} notify={setNotice} />;
    }
    if (page === "reports") {
      return <ReportsPage reports={reports} zoneNames={zoneNames} role={profile.role} onStatus={updateReportStatus} onReview={reviewReport} />;
    }
    if (page === "announcements") {
      return <AnnouncementsPage announcements={announcements} role={profile.role} refresh={refreshWorkspace} notify={setNotice} />;
    }
    if (page === "accounts" && profile.role === "admin") {
      return <AccountsPage accounts={accounts} invitations={invitations} assignments={assignments} zones={zones} refresh={refreshWorkspace} notify={setNotice} />;
    }
    if (page === "settings" && profile.role === "admin") {
      return <SettingsPage settings={settings} refresh={refreshWorkspace} notify={setNotice} />;
    }
    if (page === "activity" && profile.role === "admin") {
      return <ActivityPage activity={activity} accounts={accounts} />;
    }
    if (page === "profile") {
      return <ProfilePage profile={profile} refreshProfile={() => loadProfile(session)} notify={setNotice} />;
    }
    return <section className="panel"><h2>Page unavailable</h2><p className="muted">Your account does not have permission to access this section.</p></section>;
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="brand-mark small">P</div><div><strong>Park-IT</strong><span>STAFF PORTAL</span></div></div>
        <p className="nav-caption">WORKSPACE</p>
        <nav>{visibleMenu.map((item) => <button key={item.id} className={`nav-item ${page === item.id ? "selected" : ""}`} onClick={() => { setPage(item.id); setNotice(""); }}><span className="nav-icon">{item.icon}</span>{item.label}{item.id === "reports" && activeReports > 0 && <span className="nav-count">{activeReports}</span>}</button>)}</nav>
        <div className="sidebar-bottom"><span className="online-indicator" />Connected to Supabase</div>
      </aside>
      <main className="main-area">
        <header className="topbar"><button className="mobile-brand" onClick={() => setPage("overview")}>Park-IT</button><div className="topbar-spacer" /><button className="refresh-button" onClick={() => void refreshWorkspace().then(() => setNotice("Portal data refreshed.")).catch((error: unknown) => setNotice(messageOf(error)))}>↻ <span>Refresh</span></button><button className="user-chip" onClick={() => setPage("profile")}><span className="avatar">{(profile.full_name ?? profile.email).slice(0, 1).toUpperCase()}</span><span className="user-chip-text"><strong>{profile.full_name || profile.email}</strong><small>{profile.role}</small></span></button><button className="logout-button" onClick={() => void supabase.auth.signOut()}>Sign out</button></header>
        <div className="page-content">{notice && <div className={`notice ${notice.startsWith("Could not") || notice.includes("required") || notice.includes("failed") ? "error" : "success"}`} role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}{content()}</div>
      </main>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="stat-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

function ReportPhoto({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setUrl(null);
    setError("");
    if (!supabase) return;
    void supabase.storage.from("report-photos").createSignedUrl(path, 300).then(({ data, error: signedUrlError }) => {
      if (!active) return;
      if (signedUrlError) setError(signedUrlError.message);
      else setUrl(data.signedUrl);
    });
    return () => { active = false; };
  }, [path]);
  if (error) return <p className="report-photo-note">Could not load report photo: {error}</p>;
  if (!url) return <p className="report-photo-note">Loading report photo…</p>;
  return <a className="report-photo-link" href={url} target="_blank" rel="noreferrer"><img className="report-photo" src={url} alt="Photo attached to the parking report" />Open full photo</a>;
}

function InvitePasswordSetup({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    if (password.length < 8) { setErrorMessage("Use at least 8 characters."); return; }
    if (password !== confirmation) { setErrorMessage("Passwords do not match."); return; }
    setSaving(true);
    setErrorMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) setErrorMessage(error.message);
    else onComplete();
  };
  return <main className="login-screen"><form className="login-card" onSubmit={submit}><div className="brand-mark">P</div><p className="eyebrow">PARK-IT ACCOUNT</p><h1>Choose a password</h1><p className="muted">Set a password to activate your staff account or regain access to it.</p>{errorMessage && <div className="notice error">{errorMessage}</div>}<label>New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label><label>Confirm password<input type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button className="primary full" disabled={saving}>{saving ? "Saving…" : "Save password and continue"}</button></form></main>;
}

function ZoneProgress({ zone }: { zone: Zone }) {
  const percent = zone.capacity > 0 ? Math.min(100, Math.round((zone.current_occupancy / zone.capacity) * 100)) : 0;
  return <div className="zone-progress"><div className="zone-progress-top"><div><strong>{zone.name}</strong><span className="muted">{zone.is_active ? zone.status : "Inactive"}</span></div><span>{zone.current_occupancy} / {zone.capacity}</span></div><div className="progress-track"><div className={`progress-value ${percent >= 90 ? "warning" : ""}`} style={{ width: `${percent}%` }} /></div><small>{percent}% occupied{zone.description ? ` · ${zone.description}` : ""}</small></div>;
}

function ReportTable({ reports, zoneNames }: { reports: Report[]; zoneNames: Map<number, string> }) {
  if (reports.length === 0) return <Empty>No reports to display.</Empty>;
  return <div className="table-wrap"><table><thead><tr><th>Report</th><th>Zone</th><th>Issue</th><th>Status</th><th>Submitted</th></tr></thead><tbody>{reports.map((report) => <tr key={report.id}><td>#{report.id}</td><td>{zoneNames.get(report.zone_id) ?? `Zone ${report.zone_id}`}</td><td><strong>{report.category}</strong><small className="table-subtext">{report.description}</small></td><td><span className={`badge ${report.status.toLowerCase().replace(" ", "-")}`}>{report.status}</span></td><td>{formatDate(report.created_at)}</td></tr>)}</tbody></table></div>;
}

function ZonesPage({ zones, role, onOccupancy, refresh, notify }: { zones: Zone[]; role: Role; onOccupancy: (id: number, value: number) => Promise<void>; refresh: () => Promise<void>; notify: (value: string) => void }) {
  const [occupancies, setOccupancies] = useState<Record<number, string>>({});
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("50");
  const [description, setDescription] = useState("");
  const isAdmin = role === "admin";

  const saveCapacity = async (zone: Zone) => {
    if (!supabase) return;
    const value = Number(capacityById[zone.id] ?? zone.capacity);
    if (!Number.isInteger(value) || value < 1 || value < zone.current_occupancy) {
      notify("Capacity must be a positive whole number and cannot be lower than current occupancy.");
      return;
    }
    const { error } = await supabase.from("parking_zones").update({ capacity: value }).eq("id", zone.id);
    if (error) notify(error.message);
    else { notify(`${zone.name} capacity updated.`); await refresh(); }
  };
  const [capacityById, setCapacityById] = useState<Record<number, string>>({});
  const createZone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.from("parking_zones").insert({ name: name.trim(), capacity: Number(capacity), description: description.trim() || null });
    if (error) notify(error.message);
    else { notify("Parking zone created."); setName(""); setDescription(""); await refresh(); }
  };
  const toggleZone = async (zone: Zone) => {
    if (!supabase) return;
    const { error } = await supabase.from("parking_zones").update({ is_active: !zone.is_active }).eq("id", zone.id);
    if (error) notify(error.message);
    else { notify(`${zone.name} ${zone.is_active ? "deactivated" : "activated"}.`); await refresh(); }
  };
  const removeZone = async (zone: Zone) => {
    if (!supabase || !window.confirm(`Delete ${zone.name}? Zones with reports cannot be deleted.`)) return;
    const { error } = await supabase.from("parking_zones").delete().eq("id", zone.id);
    if (error) notify(error.message);
    else { notify(`${zone.name} deleted.`); await refresh(); }
  };

  return <><div className="page-heading"><div><p className="eyebrow">CAMPUS CAPACITY</p><h1>Parking zones</h1><p className="muted">Review live occupancy and configure parking areas.</p></div></div>
    {isAdmin && <form className="panel form-panel inline-form" onSubmit={createZone}><div><h2>Add a zone</h2><p className="muted">New zones are available to students immediately.</p></div><label>Name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Zone C" /></label><label>Capacity<input required type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} /></label><label>Description<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional location details" /></label><button className="primary">Create zone</button></form>}
    {zones.length === 0 ? <section className="panel"><Empty>No zones are configured.</Empty></section> : <div className="zone-grid">{zones.map((zone) => <article className={`panel zone-card ${!zone.is_active ? "disabled-zone" : ""}`} key={zone.id}><div className="zone-card-head"><div><span className="eyebrow">{zone.is_active ? zone.status.toUpperCase() : "INACTIVE"}</span><h2>{zone.name}</h2><p className="muted">{zone.description || "No description"}</p></div><span className="zone-capacity">{zone.capacity}<small> capacity</small></span></div><ZoneProgress zone={zone} /><label>Current occupancy<input type="number" min="0" max={zone.capacity} value={occupancies[zone.id] ?? String(zone.current_occupancy)} onChange={(event) => setOccupancies({ ...occupancies, [zone.id]: event.target.value })} /></label><div className="button-row"><button className="primary" onClick={() => { const value = Number(occupancies[zone.id] ?? zone.current_occupancy); if (!Number.isInteger(value) || value < 0 || value > zone.capacity) notify(`Occupancy must be between 0 and ${zone.capacity}.`); else void onOccupancy(zone.id, value); }}>Save occupancy</button>{isAdmin && <><label className="compact-label">Capacity<input type="number" min={Math.max(1, zone.current_occupancy)} value={capacityById[zone.id] ?? String(zone.capacity)} onChange={(event) => setCapacityById({ ...capacityById, [zone.id]: event.target.value })} /></label><button className="secondary" onClick={() => void saveCapacity(zone)}>Save capacity</button><button className="secondary" onClick={() => void toggleZone(zone)}>{zone.is_active ? "Deactivate" : "Activate"}</button><button className="danger-outline" onClick={() => void removeZone(zone)}>Delete</button></>}</div></article>)}</div>}
  </>;
}

function ReportsPage({ reports, zoneNames, role, onStatus, onReview }: { reports: Report[]; zoneNames: Map<number, string>; role: Role; onStatus: (id: number, status: string, remark: string) => Promise<void>; onReview: (id: number, action: string, duplicateOf?: number | null) => Promise<void> }) {
  const [remarks, setRemarks] = useState<Record<number, string>>({});
  return <><div className="page-heading"><div><p className="eyebrow">INCIDENT MANAGEMENT</p><h1>Parking reports</h1><p className="muted">{reports.length} reports visible to your account.</p></div></div>
    {reports.length === 0 ? <section className="panel"><Empty>No reports are assigned to your account.</Empty></section> : <div className="report-list">{reports.map((report) => <article className="panel report-card" key={report.id}><div className="report-top"><div><span className="eyebrow">REPORT #{report.id} · {zoneNames.get(report.zone_id) ?? `Zone ${report.zone_id}`}</span><h2>{report.category}</h2></div><span className={`badge ${report.status.toLowerCase().replace(" ", "-")}`}>{report.status}</span></div><p>{report.description}</p><small className="muted">Submitted {formatDate(report.created_at)} · Student {report.student_id.slice(0, 8)}…</small>{report.photo_url && <ReportPhoto path={report.photo_url} />}<label>Staff remark<textarea rows={2} placeholder="Add an update for the student" value={remarks[report.id] ?? ""} onChange={(event) => setRemarks({ ...remarks, [report.id]: event.target.value })} /></label><div className="button-row">{report.status !== "In Progress" && report.status !== "Resolved" && report.status !== "Rejected" && <button className="secondary" onClick={() => void onStatus(report.id, "In Progress", remarks[report.id] ?? "")}>Start review</button>}{report.status !== "Resolved" && report.status !== "Rejected" && <button className="primary" onClick={() => void onStatus(report.id, "Resolved", remarks[report.id] ?? "")}>Resolve</button>}{role === "admin" && <><button className="secondary" onClick={() => void onReview(report.id, "reopen")}>Reopen</button><button className="secondary" onClick={() => { const input = window.prompt("Enter the report ID this item duplicates."); if (input === null) return; const duplicateId = Number(input); if (!Number.isInteger(duplicateId) || duplicateId < 1) { window.alert("Enter a valid report ID."); return; } void onReview(report.id, "duplicate", duplicateId); }}>Mark duplicate</button><button className="danger-outline" onClick={() => void onReview(report.id, "spam")}>Mark spam</button></>}</div></article>)}</div>}
  </>;
}

function AnnouncementsPage({ announcements, role, refresh, notify }: { announcements: Announcement[]; role: Role; refresh: () => Promise<void>; notify: (value: string) => void }) {
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("student");
  const [expiresAt, setExpiresAt] = useState("");
  const publish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.rpc("publish_announcement", {
      p_message: message.trim(),
      p_audience: audience,
      p_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
    if (error) notify(error.message);
    else { notify("Announcement published and notifications sent."); setMessage(""); setExpiresAt(""); await refresh(); }
  };
  const toggle = async (announcement: Announcement) => {
    if (!supabase) return;
    const { error } = await supabase.from("announcements").update({ is_active: !announcement.is_active }).eq("id", announcement.id);
    if (error) notify(error.message);
    else { notify("Announcement updated."); await refresh(); }
  };
  return <><div className="page-heading"><div><p className="eyebrow">CAMPUS UPDATES</p><h1>Announcements</h1><p className="muted">Publish messages to students and staff.</p></div></div><form className="panel form-panel" onSubmit={publish}><h2>Compose announcement</h2><label>Message<textarea rows={4} required maxLength={1000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Share a parking update…" /></label><div className="form-grid"><label>Audience<select value={audience} onChange={(event) => setAudience(event.target.value)}><option value="student">Students</option><option value="guard">Guards</option><option value="all">Everyone</option></select></label><label>Expires (optional)<input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label></div><button className="primary">Publish announcement</button></form><section className="panel"><div className="panel-heading"><h2>Recent announcements</h2></div>{announcements.length === 0 ? <Empty>No announcements yet.</Empty> : <div className="announcement-list">{announcements.map((item) => <article className="announcement-item" key={item.id}><div><span className="badge">{item.audience}</span><p>{item.message}</p><small className="muted">{formatDate(item.created_at)}{item.expires_at ? ` · Expires ${formatDate(item.expires_at)}` : ""}</small></div><div className="announcement-actions"><span className={`status-dot ${item.is_active ? "active" : ""}`} />{item.is_active ? "Active" : "Inactive"}{role === "admin" && <button className="text-button" onClick={() => void toggle(item)}>{item.is_active ? "Deactivate" : "Activate"}</button>}</div></article>)}</div>}</section></>;
}

function AccountsPage({ accounts, invitations, assignments, zones, refresh, notify }: { accounts: Account[]; invitations: Invitation[]; assignments: Assignment[]; zones: Zone[]; refresh: () => Promise<void>; notify: (value: string) => void }) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("student");
  const [studentId, setStudentId] = useState("");
  const [guardId, setGuardId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const { data, error } = await supabase.functions.invoke<{ email_sent: boolean }>("invite-account", { body: { email: inviteEmail.trim(), role: inviteRole, student_id: inviteRole === "student" ? studentId.trim() : null } });
    if (error) notify(error.message);
    else { notify(data?.email_sent ? "Staff invitation email sent." : "Student is authorized to sign up with this Student ID and email."); setInviteEmail(""); setStudentId(""); await refresh(); }
  };
  const updateAccount = async (account: Account, role: string, isActive: boolean) => {
    if (!supabase) return;
    const { error } = await supabase.rpc("admin_update_user", { p_user_id: account.id, p_role: role, p_is_active: isActive });
    if (error) notify(error.message);
    else { notify("Account access updated."); await refresh(); }
  };
  const revokeInvitation = async (invitation: Invitation) => {
    if (!supabase) return;
    const { error } = await supabase.from("account_invitations").update({ status: "revoked" }).eq("id", invitation.id);
    if (error) notify(error.message);
    else { notify("Invitation revoked."); await refresh(); }
  };
  const assignGuard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.from("guard_assignments").insert({ guard_id: guardId, zone_id: Number(zoneId) });
    if (error) notify(error.message);
    else { notify("Guard assigned to zone."); await refresh(); }
  };
  const removeAssignment = async (id: number) => {
    if (!supabase) return;
    const { error } = await supabase.from("guard_assignments").delete().eq("id", id);
    if (error) notify(error.message);
    else { notify("Guard assignment removed."); await refresh(); }
  };
  const activeGuards = accounts.filter((account) => account.role === "guard" && account.is_active);
  const pendingInvitations = invitations.filter((invitation) => invitation.status === "pending");
  return <><div className="page-heading"><div><p className="eyebrow">ACCESS CONTROL</p><h1>Accounts & guards</h1><p className="muted">Invite people, set roles, and assign zone coverage.</p></div></div>
    <div className="content-grid"><form className="panel form-panel" onSubmit={invite}><h2>Invite an account</h2><p className="muted">The invitee chooses their password through the secure email flow.</p><label>Email<input type="email" required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} /></label><label>Role<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}><option value="student">Student</option><option value="guard">Guard</option><option value="admin">Administrator</option></select></label>{inviteRole === "student" && <label>Student ID<input required inputMode="numeric" pattern="[0-9]{6,20}" value={studentId} onChange={(event) => setStudentId(event.target.value)} /></label>}<button className="primary">Send invitation</button></form>
      <form className="panel form-panel" onSubmit={assignGuard}><h2>Assign a guard</h2><p className="muted">Guards can update occupancy and manage reports in assigned zones.</p><label>Guard<select required value={guardId} onChange={(event) => setGuardId(event.target.value)}><option value="">Select a guard</option>{activeGuards.map((guard) => <option value={guard.id} key={guard.id}>{guard.full_name || guard.email}</option>)}</select></label><label>Zone<select required value={zoneId} onChange={(event) => setZoneId(event.target.value)}><option value="">Select a zone</option>{zones.filter((zone) => zone.is_active).map((zone) => <option value={zone.id} key={zone.id}>{zone.name}</option>)}</select></label><button className="primary">Assign zone</button></form></div>
    <section className="panel"><div className="panel-heading"><h2>Accounts</h2><span className="muted">{accounts.length} users</span></div><div className="table-wrap"><table><thead><tr><th>Name / email</th><th>Student ID</th><th>Role</th><th>Access</th></tr></thead><tbody>{accounts.map((account) => <tr key={account.id}><td><strong>{account.full_name || "—"}</strong><small className="table-subtext">{account.email}</small></td><td>{account.student_id || "—"}</td><td><select value={account.role} onChange={(event) => void updateAccount(account, event.target.value, account.is_active)}><option value="student">Student</option><option value="guard">Guard</option><option value="admin">Administrator</option></select></td><td><label className="toggle"><input type="checkbox" checked={account.is_active} onChange={(event) => void updateAccount(account, account.role, event.target.checked)} /><span>{account.is_active ? "Active" : "Disabled"}</span></label></td></tr>)}</tbody></table></div></section>
    <section className="panel"><div className="panel-heading"><h2>Zone assignments</h2></div>{assignments.length === 0 ? <Empty>No guard assignments.</Empty> : <div className="table-wrap"><table><thead><tr><th>Guard</th><th>Zone</th><th /></tr></thead><tbody>{assignments.map((assignment) => <tr key={assignment.id}><td>{accounts.find((item) => item.id === assignment.guard_id)?.full_name || accounts.find((item) => item.id === assignment.guard_id)?.email || assignment.guard_id}</td><td>{zones.find((item) => item.id === assignment.zone_id)?.name ?? assignment.zone_id}</td><td><button className="danger-outline" onClick={() => void removeAssignment(assignment.id)}>Remove</button></td></tr>)}</tbody></table></div>}</section>
    <section className="panel"><div className="panel-heading"><h2>Pending invitations</h2><span className="muted">{pendingInvitations.length}</span></div>{pendingInvitations.length === 0 ? <Empty>No pending invitations.</Empty> : <div className="table-wrap"><table><thead><tr><th>Email</th><th>Role</th><th>Student ID</th><th>Sent</th><th /></tr></thead><tbody>{pendingInvitations.map((invitation) => <tr key={invitation.id}><td>{invitation.email}</td><td>{invitation.role}</td><td>{invitation.student_id || "—"}</td><td>{formatDate(invitation.created_at)}</td><td><button className="danger-outline" onClick={() => void revokeInvitation(invitation)}>Revoke</button></td></tr>)}</tbody></table></div>}</section>
  </>;
}

function SettingsPage({ settings, refresh, notify }: { settings: Setting[]; refresh: () => Promise<void>; notify: (value: string) => void }) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("{}");
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    let parsed: unknown;
    try { parsed = JSON.parse(value); } catch { notify("Value must be valid JSON."); return; }
    const { data } = await supabase.auth.getUser();
    const { error } = await supabase.from("system_settings").upsert({ key: key.trim(), value: parsed, updated_by: data.user?.id });
    if (error) notify(error.message);
    else { notify("System setting saved."); setKey(""); setValue("{}"); await refresh(); }
  };
  const remove = async (settingKey: string) => {
    if (!supabase || !window.confirm(`Delete setting "${settingKey}"?`)) return;
    const { error } = await supabase.from("system_settings").delete().eq("key", settingKey);
    if (error) notify(error.message);
    else { notify("Setting deleted."); await refresh(); }
  };
  return <><div className="page-heading"><div><p className="eyebrow">CONFIGURATION</p><h1>System settings</h1><p className="muted">Store app-wide settings as JSON values.</p></div></div><form className="panel form-panel" onSubmit={save}><h2>Add or update a setting</h2><div className="form-grid"><label>Key<input required pattern="[a-zA-Z0-9_.-]+" value={key} onChange={(event) => setKey(event.target.value)} placeholder="parking.notice" /></label><label>JSON value<textarea required rows={3} value={value} onChange={(event) => setValue(event.target.value)} /></label></div><button className="primary">Save setting</button></form><section className="panel"><div className="panel-heading"><h2>Current settings</h2></div>{settings.length === 0 ? <Empty>No settings have been added.</Empty> : <div className="table-wrap"><table><thead><tr><th>Key</th><th>Value</th><th>Updated</th><th /></tr></thead><tbody>{settings.map((setting) => <tr key={setting.key}><td><code>{setting.key}</code></td><td><code>{JSON.stringify(setting.value)}</code></td><td>{formatDate(setting.updated_at)}</td><td><button className="danger-outline" onClick={() => void remove(setting.key)}>Delete</button></td></tr>)}</tbody></table></div>}</section></>;
}

function ActivityPage({ activity, accounts }: { activity: { id: number; user_id: string | null; action: string; details: Record<string, unknown>; created_at: string }[]; accounts: Account[] }) {
  return <><div className="page-heading"><div><p className="eyebrow">AUDIT TRAIL</p><h1>Activity log</h1><p className="muted">Recent administrative and parking operations.</p></div></div><section className="panel">{activity.length === 0 ? <Empty>No activity has been recorded.</Empty> : <div className="activity-list">{activity.map((item) => <article key={item.id} className="activity-item"><span className="activity-icon">◷</span><div><strong>{item.action.replaceAll("_", " ")}</strong><p>{item.user_id ? accounts.find((account) => account.id === item.user_id)?.email ?? item.user_id : "System"} · {JSON.stringify(item.details)}</p><small className="muted">{formatDate(item.created_at)}</small></div></article>)}</div>}</section></>;
}

function ProfilePage({ profile, refreshProfile, notify }: { profile: Profile; refreshProfile: () => Promise<void>; notify: (value: string) => void }) {
  const [name, setName] = useState(profile.full_name ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const saveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.from("users").update({ full_name: name.trim() || null }).eq("id", profile.id);
    if (error) notify(error.message);
    else { notify("Profile updated."); await refreshProfile(); }
  };
  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    if (password.length < 8) { notify("Use at least 8 characters for your password."); return; }
    if (password !== confirmPassword) { notify("Passwords do not match."); return; }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) notify(error.message);
    else { notify("Password updated."); setPassword(""); setConfirmPassword(""); }
  };
  return <><div className="page-heading"><div><p className="eyebrow">YOUR ACCOUNT</p><h1>My profile</h1><p className="muted">Manage your staff profile and password.</p></div></div><div className="content-grid"><form className="panel form-panel" onSubmit={saveName}><h2>Profile details</h2><label>Display name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email<input value={profile.email} readOnly /></label><label>Role<input value={profile.role} readOnly /></label><button className="primary">Save profile</button></form><form className="panel form-panel" onSubmit={savePassword}><h2>Change password</h2><label>New password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label>Confirm password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label><button className="primary">Update password</button></form></div></>;
}
