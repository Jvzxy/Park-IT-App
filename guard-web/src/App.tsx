import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Session } from "@supabase/supabase-js";
import {
  Alert, Avatar, AskContext, Badge, BrandMark, Btn, ConfirmDialog, DailyBars, EmptyState, Icon, Modal,
  Skeleton, StatusBadge, StatusDonut, Switch, Toast, timeAgo, useAsk,
} from "./ui";
import type { ConfirmOptions, DayCount, IconName, Tone } from "./ui";

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
type ActivityEntry = { id: number; user_id: string | null; action: string; details: Record<string, unknown>; created_at: string };

type NavItem = { id: Page; label: string; icon: IconName; group: string; adminOnly?: boolean };
const menu: NavItem[] = [
  { id: "overview", label: "Overview", icon: "dashboard", group: "Operations" },
  { id: "zones", label: "Parking zones", icon: "parking", group: "Operations" },
  { id: "reports", label: "Reports", icon: "clipboard", group: "Operations" },
  { id: "announcements", label: "Announcements", icon: "megaphone", group: "Operations" },
  { id: "accounts", label: "Accounts", icon: "users", group: "Administration", adminOnly: true },
  { id: "settings", label: "System settings", icon: "sliders", group: "Administration", adminOnly: true },
  { id: "activity", label: "Activity log", icon: "history", group: "Administration", adminOnly: true },
  { id: "profile", label: "My profile", icon: "user", group: "Account" },
];

type Notify = (message: string, tone?: "success" | "error") => void;
const REPORT_STATUSES = ["Pending", "In Progress", "Resolved", "Rejected"];
const PAGE_STEP = 20;

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

/* -------------------------------------------------------------------------- */
/*  Theme                                                                      */
/* -------------------------------------------------------------------------- */

type Theme = "light" | "dark";
const THEME_KEY = "park-it-theme";

function readInitialTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* storage can be unavailable; fall back to the system setting */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const initialTheme = readInitialTheme();
document.documentElement.dataset.theme = initialTheme;

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: initialTheme, toggle: () => undefined });

function ThemeButton() {
  const { theme, toggle } = useContext(ThemeContext);
  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={label} title={label}>
      <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
    </button>
  );
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore: the preference simply will not persist */
    }
  }, [theme]);
  const value = useMemo(() => ({ theme, toggle: () => setTheme((current) => (current === "dark" ? "light" : "dark")) }), [theme]);
  return (
    <ThemeContext.Provider value={value}>
      <Portal />
    </ThemeContext.Provider>
  );
}

function Portal() {
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
  const [noticeNonce, setNoticeNonce] = useState(0);
  const [zones, setZones] = useState<Zone[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);
  const toastHost = useRef<HTMLDivElement>(null);

  const notify = useCallback<Notify>((message, tone = "error") => {
    setNotice(message);
    setNoticeIsSuccess(tone === "success");
    setNoticeNonce((value) => value + 1);
  }, []);

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
      notify(`Could not load your account: ${error.message}`);
      setProfile(null);
      setLoading(false);
      return;
    }
    if (!data || !data.is_active || !["guard", "admin"].includes(data.role)) {
      notify("This portal is for active guard and administrator accounts.");
      setProfile(null);
      setLoading(false);
      await supabase.auth.signOut();
      return;
    }
    setProfile(data as Profile);
    setPage("overview");
    setLoading(false);
  }, [notify]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) notify(`Could not restore your session: ${error.message}`);
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
  }, [loadProfile, notify]);

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
      setActivity((activityResult.data ?? []) as ActivityEntry[]);
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
    setLoadError("");
    setLastSynced(new Date());
  }, [profile]);

  useEffect(() => {
    if (!profile) {
      setDataLoaded(false);
      return;
    }
    void refreshWorkspace()
      .catch((error: unknown) => {
        const message = `Could not load portal data: ${messageOf(error)}`;
        setLoadError(message);
        notify(message);
      })
      .finally(() => setDataLoaded(true));
  }, [profile, refreshWorkspace, notify]);

  const visibleMenu = useMemo(
    () => menu.filter((item) => !item.adminOnly || profile?.role === "admin"),
    [profile],
  );
  const navGroups = useMemo(() => {
    const groups: { label: string; items: NavItem[] }[] = [];
    for (const item of visibleMenu) {
      const existing = groups.find((group) => group.label === item.group);
      if (existing) existing.items.push(item);
      else groups.push({ label: item.group, items: [item] });
    }
    return groups;
  }, [visibleMenu]);
  const zoneNames = useMemo(() => new Map(zones.map((zone) => [zone.id, zone.name])), [zones]);
  const activeReports = reports.filter((report) => report.status !== "Resolved" && report.status !== "Rejected").length;
  const pageLabel = menu.find((item) => item.id === page)?.label ?? "Park-IT";

  useEffect(() => {
    document.title = profile ? `${pageLabel} – Park-IT` : "Park-IT staff portal";
  }, [pageLabel, profile]);

  /* Toasts live in the top layer (popover) so they stay visible above open dialogs. */
  useEffect(() => {
    const host = toastHost.current as (HTMLDivElement & { showPopover?: () => void; hidePopover?: () => void }) | null;
    if (!host) return;
    host.setAttribute("popover", "manual");
    try {
      host.hidePopover?.();
    } catch {
      /* already hidden */
    }
    if (notice && profile) {
      try {
        host.showPopover?.();
      } catch {
        /* popover unsupported: the fixed-position fallback still shows the toast */
      }
    }
  }, [notice, noticeNonce, profile]);

  useEffect(() => {
    if (!notice || !profile) return;
    const timer = window.setTimeout(() => setNotice(""), noticeIsSuccess ? 4500 : 9000);
    return () => window.clearTimeout(timer);
  }, [notice, noticeNonce, noticeIsSuccess, profile]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);

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

      if (error) notify(error.message);
    } catch (error) {
      notify(messageOf(error));
    } finally {
      setSubmitting(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!supabase) return;

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      notify("Enter your administrator email address first.");
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

      notify(
        "Password reset email sent. Open the newest email and follow its link to set your password.",
        "success",
      );
    } catch (error) {
      notify(`Password reset failed: ${messageOf(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (successMessage: string, action: () => Promise<{ error: { message: string } | null }>) => {
    setNotice("");
    try {
      const { error } = await action();
      if (error) throw new Error(error.message);
      notify(successMessage, "success");
      await refreshWorkspace();
    } catch (error) {
      notify(messageOf(error));
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

  const deleteReport = (report: Report) => {
    setConfirmOptions({
      title: `Delete report #${report.id}?`,
      message: "This will permanently remove the report and its update history.",
      confirmLabel: "Delete report",
      onConfirm: () => {
        void runAction(`Report #${report.id} deleted.`, async () => {
          if (!supabase) return { error: { message: "Supabase is not configured." } };
          return supabase.from("parking_reports").delete().eq("id", report.id);
        });
      },
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    void refreshWorkspace()
      .then(() => notify("Portal data refreshed.", "success"))
      .catch((error: unknown) => notify(messageOf(error)))
      .finally(() => setRefreshing(false));
  };

  if (!supabase) {
    return (
      <AuthShell>
        <div className="auth-card">
          <h1>Connect Park-IT</h1>
          <p className="lead">Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>guard-web/.env.local</code>, then restart the portal.</p>
        </div>
      </AuthShell>
    );
  }

  if (loading) {
    return (
      <main className="loading-screen" role="status">
        <BrandMark size={44} />
        <div className="loading-row"><span className="spinner" />Loading Park-IT…</div>
      </main>
    );
  }

  if (session && profile && needsPasswordSetup) {
    return <InvitePasswordSetup onComplete={() => {
      setNeedsPasswordSetup(false);
      window.history.replaceState({}, "", window.location.pathname.replace(/\/invite-accept$/, "/"));
    }} />;
  }

  if (!session || !profile) {
    return (
      <AuthShell>
        <form className="auth-card" onSubmit={submitLogin}>
          <h1>Staff portal</h1>
          <p className="lead">Sign in with your invited guard or administrator account.</p>
          {notice && <Alert tone={noticeIsSuccess ? "success" : "error"}>{notice}</Alert>}
          <label className="field"><span>Email address</span><input className="input" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="field"><span>Password</span><input className="input" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="btn btn-primary btn-md btn-block" disabled={submitting}>{submitting ? "Please wait…" : "Sign in"}</button>
          <button
            type="button"
            className="link-btn"
            disabled={submitting}
            onClick={() => void sendPasswordReset()}
          >
            Forgot password? Set or reset password
          </button>
          <p className="auth-fine">Access is provisioned by a Park-IT administrator. Need help? Contact your system administrator.</p>
        </form>
      </AuthShell>
    );
  }

  const content = () => {
    if (page === "overview") {
      return <OverviewPage zones={zones} reports={reports} announcements={announcements} zoneNames={zoneNames} role={profile.role} activeReports={activeReports} loaded={dataLoaded} onNavigate={setPage} />;
    }
    if (page === "zones") {
      return <ZonesPage zones={zones} role={profile.role} loaded={dataLoaded} onOccupancy={setOccupancy} refresh={refreshWorkspace} notify={notify} />;
    }
    if (page === "reports") {
      return <ReportsPage reports={reports} zoneNames={zoneNames} role={profile.role} loaded={dataLoaded} onStatus={updateReportStatus} onReview={reviewReport} onDelete={deleteReport} />;
    }
    if (page === "announcements") {
      return <AnnouncementsPage announcements={announcements} role={profile.role} loaded={dataLoaded} refresh={refreshWorkspace} notify={notify} />;
    }
    if (page === "accounts" && profile.role === "admin") {
      return <AccountsPage accounts={accounts} invitations={invitations} assignments={assignments} zones={zones} loaded={dataLoaded} refresh={refreshWorkspace} notify={notify} />;
    }
    if (page === "settings" && profile.role === "admin") {
      return <SettingsPage settings={settings} loaded={dataLoaded} refresh={refreshWorkspace} notify={notify} />;
    }
    if (page === "activity" && profile.role === "admin") {
      return <ActivityPage activity={activity} accounts={accounts} loaded={dataLoaded} />;
    }
    if (page === "profile") {
      return <ProfilePage profile={profile} refreshProfile={() => loadProfile(session)} notify={notify} />;
    }
    return (
      <section className="panel">
        <EmptyState icon="lock" title="Page unavailable">Your account does not have permission to access this section.</EmptyState>
      </section>
    );
  };

  return (
    <AskContext.Provider value={setConfirmOptions}>
      <div className="app">
        <a className="skip-link" href="#content">Skip to content</a>
        <aside id="primary-nav" className={`sidebar ${navOpen ? "open" : ""}`} aria-label="Primary">
          <div className="sidebar-head">
            <BrandMark size={34} />
            <div className="brand-text"><strong>Park-IT</strong><span>Staff portal</span></div>
            <button type="button" className="icon-btn sidebar-close" onClick={() => setNavOpen(false)} aria-label="Close navigation"><Icon name="x" size={18} /></button>
          </div>
          <nav className="nav" aria-label="Main">
            {navGroups.map((group) => (
              <div className="nav-group" key={group.label}>
                <p className="nav-group-label">{group.label}</p>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`nav-link ${page === item.id ? "active" : ""}`}
                    aria-current={page === item.id ? "page" : undefined}
                    onClick={() => { setPage(item.id); setNotice(""); setNavOpen(false); }}
                  >
                    <Icon name={item.icon} size={18} />
                    <span>{item.label}</span>
                    {item.id === "reports" && activeReports > 0 && <span className="nav-badge" aria-label={`${activeReports} open reports`}>{activeReports}</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-foot"><span className="live-dot" />Connected to Supabase</div>
        </aside>
        {navOpen && <button type="button" className="scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}

        <div className="main">
          <header className="topbar">
            <button type="button" className="icon-btn topbar-menu" onClick={() => setNavOpen(true)} aria-label="Open navigation" aria-expanded={navOpen} aria-controls="primary-nav"><Icon name="menu" size={20} /></button>
            <span className="topbar-title">{pageLabel}</span>
            <div className="topbar-spacer" />
            {lastSynced && <span className="sync-note"><Icon name="clock" size={14} />Updated {lastSynced.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>}
            <button type="button" className="btn btn-ghost btn-md" onClick={handleRefresh} disabled={refreshing} aria-label="Refresh data">
              <Icon name="refresh" size={16} className={refreshing ? "spin" : undefined} /><span className="refresh-label">Refresh</span>
            </button>
            <ThemeButton />
            <span className="topbar-divider" aria-hidden="true" />
            <button type="button" className="user-chip" onClick={() => { setPage("profile"); setNavOpen(false); }} aria-label="Open my profile">
              <Avatar name={profile.full_name ?? profile.email} size={32} />
              <span className="user-chip-text"><strong>{profile.full_name || profile.email}</strong><small>{profile.role}</small></span>
            </button>
            <button type="button" className="btn btn-ghost btn-md" onClick={() => void supabase.auth.signOut()} aria-label="Sign out">
              <Icon name="logout" size={16} /><span className="signout-label">Sign out</span>
            </button>
          </header>
          <main className="content" id="content" tabIndex={-1}>
            {loadError && (
              <Alert tone="error" action={<Btn size="sm" onClick={handleRefresh} disabled={refreshing}>Try again</Btn>}>{loadError}</Alert>
            )}
            {content()}
          </main>
        </div>

        <ConfirmDialog options={confirmOptions} onClose={() => setConfirmOptions(null)} />
        <div className="toast-host" ref={toastHost}>
          {notice && <Toast key={noticeNonce} message={notice} tone={noticeIsSuccess ? "success" : "error"} onClose={() => setNotice("")} />}
        </div>
      </div>
    </AskContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared building blocks                                                     */
/* -------------------------------------------------------------------------- */

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth">
      <section className="auth-brand">
        <div className="auth-logo"><BrandMark size={36} />Park-IT</div>
        <div>
          <p className="auth-headline">Campus parking status, kept current by the guards on duty.</p>
          <ul className="auth-list">
            <li><Icon name="parking" size={18} />Update zone occupancy</li>
            <li><Icon name="clipboard" size={18} />Review and resolve student reports</li>
            <li><Icon name="megaphone" size={18} />Publish campus announcements</li>
          </ul>
        </div>
        <div>
          <p className="auth-foot">USTP-CDO Parking Space</p>
          <div className="auth-bays" aria-hidden="true" />
        </div>
      </section>
      <section className="auth-main">
        <div className="auth-theme"><ThemeButton /></div>
        <div className="auth-col">
          <div className="auth-mobile-brand"><BrandMark size={32} />Park-IT</div>
          {children}
        </div>
      </section>
    </main>
  );
}

function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div><h1>{title}</h1><p className="page-sub">{subtitle}</p></div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

function Panel({ title, sub, action, flush, children }: { title: string; sub?: string; action?: ReactNode; flush?: boolean; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div><h2 className="panel-title">{title}</h2>{sub && <p className="panel-sub">{sub}</p>}</div>
        {action}
      </div>
      <div className={`panel-body${flush ? " flush" : ""}`}>{children}</div>
    </section>
  );
}

function TextLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button type="button" className="link-btn" onClick={onClick}>{children}<Icon name="chevronRight" size={14} /></button>;
}

function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div role="status">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }, (_, index) => (
        <div className="skel-row" key={index}><Skeleton width="38%" height={14} /><Skeleton width="82%" height={10} /></div>
      ))}
    </div>
  );
}

function ShowMore({ shown, total, noun, onMore }: { shown: number; total: number; noun: string; onMore: () => void }) {
  if (shown >= total) return null;
  return (
    <div className="table-foot">
      <span>Showing {shown} of {total} {noun}</span>
      <Btn size="sm" onClick={onMore}>Show more</Btn>
    </div>
  );
}

function SearchField({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label: string }) {
  return (
    <div className="search">
      <Icon name="search" size={16} />
      <input className="input" type="search" value={value} placeholder={placeholder} aria-label={label} onChange={(event) => onChange(event.target.value)} />
      {value && <button type="button" className="icon-btn icon-btn-sm search-clear" onClick={() => onChange("")} aria-label="Clear search"><Icon name="x" size={14} /></button>}
    </div>
  );
}

/* Occupancy: logic is unchanged from the original ZoneProgress */
function zoneState(zone: Zone) {
  const percent = zone.capacity > 0 ? Math.min(100, Math.round((zone.current_occupancy / zone.capacity) * 100)) : 0;
  const isFull = zone.status.toLowerCase() === "full" || (zone.capacity > 0 && zone.current_occupancy >= zone.capacity);
  const isNearlyFull = !isFull && (zone.status.toLowerCase().includes("nearly full") || percent >= 90);
  const level: "ok" | "warning" | "full" | "inactive" = !zone.is_active ? "inactive" : isFull ? "full" : isNearlyFull ? "warning" : "ok";
  return { percent, level, free: Math.max(0, zone.capacity - zone.current_occupancy) };
}

function BayMeter({ zone, large }: { zone: Zone; large?: boolean }) {
  const { percent, level } = zoneState(zone);
  const segments = zone.capacity > 0 && zone.capacity <= 40 ? zone.capacity : 20;
  return (
    <div
      className={`bay${level === "ok" ? "" : ` ${level}`}${large ? " lg" : ""}`}
      style={{ "--n": segments } as CSSProperties}
      role="meter"
      aria-label={`${zone.name} occupancy`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${percent}% occupied`}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}

function ZoneBadge({ zone }: { zone: Zone }) {
  const { level } = zoneState(zone);
  const tone: Tone = level === "ok" ? "success" : level === "warning" ? "warning" : level === "full" ? "danger" : "neutral";
  const icon: IconName = level === "ok" ? "circleCheck" : level === "warning" ? "triangleAlert" : level === "full" ? "circleX" : "ban";
  return <Badge tone={tone} icon={icon}>{zone.is_active ? zone.status : "Inactive"}</Badge>;
}

function ZoneMonitorRow({ zone }: { zone: Zone }) {
  const { percent, free } = zoneState(zone);
  return (
    <div className="zone-row">
      <div style={{ minWidth: 0 }}>
        <div className="zone-name">{zone.name}<ZoneBadge zone={zone} /></div>
        {zone.description && <p className="zone-desc" title={zone.description}>{zone.description}</p>}
      </div>
      <div className="zone-meter">
        <BayMeter zone={zone} />
        <small>{percent}% occupied</small>
      </div>
      <div className="zone-count"><strong>{zone.current_occupancy} / {zone.capacity}</strong><span>{free} free</span></div>
    </div>
  );
}

function ReportTable({ reports, zoneNames }: { reports: Report[]; zoneNames: Map<number, string> }) {
  if (reports.length === 0) {
    return <EmptyState icon="clipboard" title="No reports to display">Reports submitted by students will appear here.</EmptyState>;
  }
  return (
    <div className="table-wrap">
      <table className="data cards">
        <thead><tr><th>Report</th><th>Zone</th><th>Issue</th><th>Status</th><th>Submitted</th></tr></thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td data-label="Report" className="id-cell">#{report.id}</td>
              <td data-label="Zone" className="nowrap">{zoneNames.get(report.zone_id) ?? `Zone ${report.zone_id}`}</td>
              <td data-label="" className="issue-cell primary"><span className="cell-main">{report.category}</span><span className="cell-sub">{report.description}</span></td>
              <td data-label="Status"><StatusBadge status={report.status} /></td>
              <td data-label="Submitted" className="nowrap" title={formatDate(report.created_at)}>{timeAgo(report.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
  if (error) return <p className="photo-note error"><Icon name="circleAlert" size={16} />Could not load report photo: {error}</p>;
  if (!url) return <p className="photo-note"><span className="spinner" />Loading report photo…</p>;
  return (
    <a className="photo" href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="Photo attached to the parking report" />
      <span><Icon name="externalLink" size={13} /> Open full photo</span>
    </a>
  );
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
  return (
    <AuthShell>
      <form className="auth-card" onSubmit={submit}>
        <h1>Choose a password</h1>
        <p className="lead">Set a password to activate your staff account or regain access to it.</p>
        {errorMessage && <Alert tone="error">{errorMessage}</Alert>}
        <label className="field"><span>New password</span><input className="input" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /><small className="field-hint">At least 8 characters.</small></label>
        <label className="field"><span>Confirm password</span><input className="input" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
        <button className="btn btn-primary btn-md btn-block" disabled={saving}>{saving ? "Saving…" : "Save password and continue"}</button>
      </form>
    </AuthShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Overview                                                                   */
/* -------------------------------------------------------------------------- */

function dayKey(day: Date): string {
  return `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
}

function lastSevenDays(reports: Report[]): DayCount[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: DayCount[] = [];
  const byKey = new Map<string, DayCount>();
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const entry: DayCount = {
      key: dayKey(day),
      label: day.toLocaleDateString(undefined, { weekday: "short" }),
      full: day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      value: 0,
    };
    days.push(entry);
    byKey.set(entry.key, entry);
  }
  for (const report of reports) {
    const entry = byKey.get(dayKey(new Date(report.created_at)));
    if (entry) entry.value += 1;
  }
  return days;
}

const STATUS_COLORS: Record<string, string> = {
  "Pending": "var(--status-pending)",
  "In Progress": "var(--status-progress)",
  "Resolved": "var(--status-resolved)",
  "Rejected": "var(--status-rejected)",
};

function OverviewPage({ zones, reports, announcements, zoneNames, role, activeReports, loaded, onNavigate }: { zones: Zone[]; reports: Report[]; announcements: Announcement[]; zoneNames: Map<number, string>; role: Role; activeReports: number; loaded: boolean; onNavigate: (page: Page) => void }) {
  const occupancy = zones.reduce((sum, zone) => sum + zone.current_occupancy, 0);
  const capacity = zones.reduce((sum, zone) => sum + zone.capacity, 0);
  const occupiedPercent = capacity > 0 ? Math.min(100, Math.round((occupancy / capacity) * 100)) : 0;
  const statusCounts = REPORT_STATUSES.map((status) => ({
    status,
    count: reports.filter((report) => report.status === status).length,
  }));
  const days = useMemo(() => lastSevenDays(reports), [reports]);
  const weekTotal = days.reduce((sum, day) => sum + day.value, 0);
  const activeAnnouncements = announcements.filter((item) => item.is_active).length;
  const value = (text: string) => (loaded ? text : <Skeleton width={56} height={26} />);

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Live campus parking and incident activity."
        actions={role === "admin" && (
          <Btn icon="download" onClick={() => downloadCsv("park-it-reports.csv", [["Report ID", "Zone", "Category", "Status", "Created"], ...reports.map((report) => [report.id, zoneNames.get(report.zone_id) ?? report.zone_id, report.category, report.status, report.created_at])])}>Export reports CSV</Btn>
        )}
      />
      <div className="kpis">
        <div className="kpi"><span className="kpi-label">Zones online</span><span className="kpi-value">{value(`${zones.filter((zone) => zone.is_active).length}/${zones.length}`)}</span><span className="kpi-note">Active parking areas</span></div>
        <div className="kpi">
          <span className="kpi-label">Vehicles parked</span>
          <span className="kpi-value">{value(`${occupancy}`)}{loaded && <small>{occupiedPercent}% full</small>}</span>
          <span className="kpi-note">of {loaded ? capacity : "…"} available spaces</span>
        </div>
        <div className="kpi"><span className="kpi-label">Open reports</span><span className="kpi-value">{value(`${activeReports}`)}</span><span className="kpi-note">Needs staff attention</span></div>
        <div className="kpi"><span className="kpi-label">Announcements</span><span className="kpi-value">{value(`${activeAnnouncements}`)}</span><span className="kpi-note">Currently active</span></div>
      </div>

      <div className="grid-main grid-stretch">
        <Panel title="Zone occupancy" sub="Current vehicles per parking zone" action={<TextLink onClick={() => onNavigate("zones")}>Manage zones</TextLink>} flush>
          {!loaded ? <SkeletonRows count={3} /> : zones.length === 0 ? (
            <EmptyState icon="parking" title="No parking zones yet">{role === "admin" ? "Add a zone on the Parking zones page to start tracking occupancy." : "An administrator needs to configure parking zones."}</EmptyState>
          ) : zones.map((zone) => <ZoneMonitorRow key={zone.id} zone={zone} />)}
        </Panel>
        <Panel title="Report summary" sub="By current status" action={<TextLink onClick={() => onNavigate("reports")}>Review reports</TextLink>}>
          {!loaded ? <SkeletonRows count={2} /> : (
            <div className="donut-wrap">
              <StatusDonut centerLabel="reports" segments={statusCounts.map(({ status, count }) => ({ label: status, value: count, color: STATUS_COLORS[status] }))} />
              <ul className="legend">
                {statusCounts.map(({ status, count }) => (
                  <li key={status}><span className="swatch" style={{ background: STATUS_COLORS[status] }} />{status}<strong>{count}</strong></li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid-main">
        <Panel title="Recent reports" sub={`${reports.length} loaded`} action={<TextLink onClick={() => onNavigate("reports")}>View all</TextLink>} flush>
          {!loaded ? <SkeletonRows count={4} /> : <ReportTable reports={reports.slice(0, 5)} zoneNames={zoneNames} />}
        </Panel>
        <Panel title="New reports" sub={`${weekTotal} in the last 7 days`}>
          {!loaded ? <Skeleton height={140} /> : <DailyBars days={days} />}
        </Panel>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Parking zones                                                              */
/* -------------------------------------------------------------------------- */

function ZonesPage({ zones, role, loaded, onOccupancy, refresh, notify }: { zones: Zone[]; role: Role; loaded: boolean; onOccupancy: (id: number, value: number) => Promise<void>; refresh: () => Promise<void>; notify: Notify }) {
  const ask = useAsk();
  const [occupancies, setOccupancies] = useState<Record<number, string>>({});
  const [capacityById, setCapacityById] = useState<Record<number, string>>({});
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("50");
  const [description, setDescription] = useState("");
  const [addOpen, setAddOpen] = useState(false);
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
    else { notify(`${zone.name} capacity updated.`, "success"); await refresh(); }
  };
  const createZone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.from("parking_zones").insert({ name: name.trim(), capacity: Number(capacity), description: description.trim() || null });
    if (error) notify(error.message);
    else { notify("Parking zone created.", "success"); setName(""); setDescription(""); setAddOpen(false); await refresh(); }
  };
  const toggleZone = async (zone: Zone) => {
    if (!supabase) return;
    const { error } = await supabase.from("parking_zones").update({ is_active: !zone.is_active }).eq("id", zone.id);
    if (error) notify(error.message);
    else { notify(`${zone.name} ${zone.is_active ? "deactivated" : "activated"}.`, "success"); await refresh(); }
  };
  const removeZone = (zone: Zone) => {
    if (!supabase) return;
    ask({
      title: `Delete ${zone.name}?`,
      message: "Zones with reports cannot be deleted. This cannot be undone.",
      confirmLabel: "Delete zone",
      onConfirm: () => {
        void (async () => {
          if (!supabase) return;
          const { error } = await supabase.from("parking_zones").delete().eq("id", zone.id);
          if (error) notify(error.message);
          else { notify(`${zone.name} deleted.`, "success"); await refresh(); }
        })();
      },
    });
  };

  return (
    <>
      <PageHeader
        title="Parking zones"
        subtitle="Review live occupancy and configure parking areas."
        actions={isAdmin && <Btn variant="primary" icon="plus" onClick={() => setAddOpen(true)}>Add zone</Btn>}
      />

      {!loaded ? (
        <div className="zone-grid">{[0, 1].map((key) => <section className="panel" key={key}><SkeletonRows count={3} /></section>)}</div>
      ) : zones.length === 0 ? (
        <section className="panel">
          <EmptyState icon="parking" title="No zones are configured" action={isAdmin ? <Btn variant="primary" icon="plus" onClick={() => setAddOpen(true)}>Add zone</Btn> : undefined}>
            {isAdmin ? "Create your first parking zone to start tracking occupancy." : "An administrator needs to configure parking zones."}
          </EmptyState>
        </section>
      ) : (
        <div className="zone-grid">
          {zones.map((zone) => {
            const { percent, free } = zoneState(zone);
            const current = occupancies[zone.id] ?? String(zone.current_occupancy);
            const dirty = current !== String(zone.current_occupancy);
            const step = (delta: number) => {
              const base = Number(current);
              const start = Number.isFinite(base) ? base : zone.current_occupancy;
              const next = Math.min(zone.capacity, Math.max(0, start + delta));
              setOccupancies({ ...occupancies, [zone.id]: String(next) });
            };
            return (
              <article className={`panel zone-card${zone.is_active ? "" : " is-inactive"}`} key={zone.id}>
                <div className="zone-card-top">
                  <div><h2>{zone.name}</h2><p>{zone.description || "No description"}</p></div>
                  <ZoneBadge zone={zone} />
                </div>
                <div className="zone-free">
                  <div className="zone-free-num"><strong>{free}</strong><span>{free === 1 ? "space free" : "spaces free"}</span></div>
                  <div className="zone-free-meta">{zone.current_occupancy} of {zone.capacity} occupied<br />{percent}% full</div>
                </div>
                <BayMeter zone={zone} large />
                <div className="zone-control">
                  <label className="field-label" htmlFor={`occ-${zone.id}`}>Current occupancy</label>
                  <div className="zone-control-row">
                    <div className="stepper">
                      <button type="button" className="btn btn-secondary btn-md" onClick={() => step(-1)} aria-label={`Decrease ${zone.name} occupancy`}><Icon name="minus" size={16} /></button>
                      <input id={`occ-${zone.id}`} className="input" type="number" min="0" max={zone.capacity} value={current} onChange={(event) => setOccupancies({ ...occupancies, [zone.id]: event.target.value })} />
                      <button type="button" className="btn btn-secondary btn-md" onClick={() => step(1)} aria-label={`Increase ${zone.name} occupancy`}><Icon name="plus" size={16} /></button>
                    </div>
                    <Btn variant="primary" onClick={() => { const value = Number(occupancies[zone.id] ?? zone.current_occupancy); if (!Number.isInteger(value) || value < 0 || value > zone.capacity) notify(`Occupancy must be between 0 and ${zone.capacity}.`); else void onOccupancy(zone.id, value); }}>Save occupancy</Btn>
                    {dirty && <span className="unsaved"><Icon name="circleAlert" size={14} />Unsaved change</span>}
                  </div>
                </div>
                {isAdmin && (
                  <div className="zone-admin">
                    <label className="field">
                      <span>Capacity</span>
                      <input className="input" type="number" min={Math.max(1, zone.current_occupancy)} value={capacityById[zone.id] ?? String(zone.capacity)} onChange={(event) => setCapacityById({ ...capacityById, [zone.id]: event.target.value })} />
                    </label>
                    <Btn onClick={() => void saveCapacity(zone)}>Save capacity</Btn>
                    <div className="zone-admin-end">
                      <Btn onClick={() => void toggleZone(zone)}>{zone.is_active ? "Deactivate" : "Activate"}</Btn>
                      <Btn variant="danger" icon="trash" onClick={() => removeZone(zone)}>Delete</Btn>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a zone" description="New zones are available to students immediately.">
        <form className="form" onSubmit={createZone}>
          <label className="field"><span>Name</span><input className="input" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Zone C" /></label>
          <div className="form-grid">
            <label className="field"><span>Capacity</span><input className="input" required type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} /></label>
            <label className="field"><span>Description</span><input className="input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional location details" /></label>
          </div>
          <div className="form-actions">
            <Btn onClick={() => setAddOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary">Create zone</Btn>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Reports                                                                    */
/* -------------------------------------------------------------------------- */

function ReportsPage({ reports, zoneNames, role, loaded, onStatus, onReview, onDelete }: { reports: Report[]; zoneNames: Map<number, string>; role: Role; loaded: boolean; onStatus: (id: number, status: string, remark: string) => Promise<void>; onReview: (id: number, action: string, duplicateOf?: number | null) => Promise<void>; onDelete: (report: Report) => void }) {
  const [remarks, setRemarks] = useState<Record<number, string>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [limit, setLimit] = useState(PAGE_STEP);
  const [duplicateTarget, setDuplicateTarget] = useState<Report | null>(null);
  const [duplicateValue, setDuplicateValue] = useState("");
  const [duplicateError, setDuplicateError] = useState("");

  useEffect(() => { setLimit(PAGE_STEP); }, [query, statusFilter, zoneFilter]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return reports.filter((report) => {
      if (statusFilter !== "all" && report.status !== statusFilter) return false;
      if (zoneFilter !== "all" && String(report.zone_id) !== zoneFilter) return false;
      if (!needle) return true;
      const haystack = `#${report.id} ${report.category} ${report.description} ${zoneNames.get(report.zone_id) ?? ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [reports, query, statusFilter, zoneFilter, zoneNames]);
  const filtersActive = query.trim() !== "" || statusFilter !== "all" || zoneFilter !== "all";
  const clearFilters = () => { setQuery(""); setStatusFilter("all"); setZoneFilter("all"); };
  const visible = filtered.slice(0, limit);

  const openDuplicate = (report: Report) => { setDuplicateTarget(report); setDuplicateValue(""); setDuplicateError(""); };
  const submitDuplicate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!duplicateTarget) return;
    const duplicateId = Number(duplicateValue);
    if (!Number.isInteger(duplicateId) || duplicateId < 1) { setDuplicateError("Enter a valid report ID."); return; }
    const target = duplicateTarget;
    setDuplicateTarget(null);
    void onReview(target.id, "duplicate", duplicateId);
  };

  return (
    <>
      <PageHeader title="Parking reports" subtitle={`${reports.length} reports visible to your account.`} />

      {loaded && reports.length > 0 && (
        <div className="toolbar">
          <SearchField value={query} onChange={setQuery} placeholder="Search by ID, issue or zone" label="Search reports" />
          <div className="chips" role="group" aria-label="Filter by status">
            <button type="button" className="chip" aria-pressed={statusFilter === "all"} onClick={() => setStatusFilter("all")}>All <span className="chip-count">{reports.length}</span></button>
            {REPORT_STATUSES.map((status) => (
              <button type="button" className="chip" key={status} aria-pressed={statusFilter === status} onClick={() => setStatusFilter(status)}>
                {status} <span className="chip-count">{reports.filter((report) => report.status === status).length}</span>
              </button>
            ))}
          </div>
          <select className="select" value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)} aria-label="Filter by zone">
            <option value="all">All zones</option>
            {Array.from(zoneNames.entries()).map(([id, zoneName]) => <option value={String(id)} key={id}>{zoneName}</option>)}
          </select>
        </div>
      )}

      {!loaded ? (
        <div className="report-list">{[0, 1, 2].map((key) => <section className="panel" key={key}><SkeletonRows count={2} /></section>)}</div>
      ) : reports.length === 0 ? (
        <section className="panel"><EmptyState icon="clipboard" title="No reports yet">No reports are assigned to your account.</EmptyState></section>
      ) : filtered.length === 0 ? (
        <section className="panel"><EmptyState icon="search" title="No reports match your filters" action={filtersActive ? <Btn onClick={clearFilters}>Clear filters</Btn> : undefined}>Try a different search term, status or zone.</EmptyState></section>
      ) : (
        <div className="report-list">
          {visible.map((report) => (
            <article className="panel" key={report.id}>
              <div className="report-head">
                <div>
                  <h2><span className="report-id">#{report.id}</span>{report.category}</h2>
                  <div className="report-meta">
                    <span><Icon name="mapPin" size={14} />{zoneNames.get(report.zone_id) ?? `Zone ${report.zone_id}`}</span>
                    <span><Icon name="clock" size={14} />Submitted {formatDate(report.created_at)}</span>
                    <span><Icon name="user" size={14} />Student {report.student_id.slice(0, 8)}…</span>
                  </div>
                </div>
                <StatusBadge status={report.status} />
              </div>
              <div className="report-body">
                <div>
                  <p className="report-text">{report.description}</p>
                  {report.photo_url && <ReportPhoto path={report.photo_url} />}
                </div>
                <div className="report-side">
                  <label className="field">
                    <span>Staff remark</span>
                    <textarea className="textarea" rows={3} placeholder="Add an update for the student" value={remarks[report.id] ?? ""} onChange={(event) => setRemarks({ ...remarks, [report.id]: event.target.value })} />
                  </label>
                </div>
              </div>
              <div className="report-actions">
                {report.status !== "In Progress" && report.status !== "Resolved" && report.status !== "Rejected" && <Btn icon="play" onClick={() => void onStatus(report.id, "In Progress", remarks[report.id] ?? "")}>Start review</Btn>}
                {report.status !== "Resolved" && report.status !== "Rejected" && <Btn variant="primary" icon="circleCheck" onClick={() => void onStatus(report.id, "Resolved", remarks[report.id] ?? "")}>Resolve</Btn>}
                <span className="grow" />
                {role === "admin" && (
                  <>
                    <Btn variant="ghost" size="sm" icon="rotateCcw" onClick={() => void onReview(report.id, "reopen")}>Reopen</Btn>
                    <Btn variant="ghost" size="sm" icon="copy" onClick={() => openDuplicate(report)}>Mark duplicate</Btn>
                    <Btn variant="danger" size="sm" icon="ban" onClick={() => void onReview(report.id, "spam")}>Mark spam</Btn>
                  </>
                )}
                <Btn variant="danger" size="sm" icon="trash" onClick={() => onDelete(report)}>Delete report</Btn>
              </div>
            </article>
          ))}
          {visible.length < filtered.length && (
            <div className="panel"><ShowMore shown={visible.length} total={filtered.length} noun="reports" onMore={() => setLimit((current) => current + PAGE_STEP)} /></div>
          )}
        </div>
      )}

      <Modal open={duplicateTarget !== null} onClose={() => setDuplicateTarget(null)} title="Mark as duplicate" description={duplicateTarget ? `Report #${duplicateTarget.id} will be marked as a duplicate of another report.` : undefined} size="sm">
        <form className="form" onSubmit={submitDuplicate}>
          <label className="field">
            <span>Duplicate of report ID</span>
            <input className="input" inputMode="numeric" value={duplicateValue} onChange={(event) => { setDuplicateValue(event.target.value); setDuplicateError(""); }} placeholder="Enter the report ID this item duplicates" data-autofocus />
            {duplicateError && <span className="field-error"><Icon name="circleAlert" size={14} />{duplicateError}</span>}
          </label>
          <div className="form-actions">
            <Btn onClick={() => setDuplicateTarget(null)}>Cancel</Btn>
            <Btn type="submit" variant="primary">Mark duplicate</Btn>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Announcements                                                              */
/* -------------------------------------------------------------------------- */

function AnnouncementsPage({ announcements, role, loaded, refresh, notify }: { announcements: Announcement[]; role: Role; loaded: boolean; refresh: () => Promise<void>; notify: Notify }) {
  const ask = useAsk();
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
    else { notify("Announcement published and notifications sent.", "success"); setMessage(""); setExpiresAt(""); await refresh(); }
  };
  const toggle = async (announcement: Announcement) => {
    if (!supabase) return;
    const { error } = await supabase.from("announcements").update({ is_active: !announcement.is_active }).eq("id", announcement.id);
    if (error) notify(error.message);
    else { notify("Announcement updated.", "success"); await refresh(); }
  };
  const remove = (announcement: Announcement) => {
    ask({
      title: "Delete this announcement?",
      message: "This cannot be undone.",
      confirmLabel: "Delete announcement",
      onConfirm: () => {
        void (async () => {
          if (!supabase) return;
          const { error } = await supabase.from("announcements").delete().eq("id", announcement.id);
          if (error) notify(error.message);
          else { notify("Announcement deleted.", "success"); await refresh(); }
        })();
      },
    });
  };
  const audienceLabel = (value: string) => (value === "all" ? "Everyone" : value === "guard" ? "Guards" : value === "student" ? "Students" : value);

  return (
    <>
      <PageHeader title="Announcements" subtitle="Publish messages to students and staff." />
      <div className="split">
        <form className="panel split-sticky" onSubmit={publish}>
          <div className="panel-head"><h2 className="panel-title">Compose announcement</h2></div>
          <div className="panel-body form">
            <label className="field">
              <span>Message</span>
              <textarea className="textarea" rows={5} required maxLength={1000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Share a parking update…" />
              <span className="char-count">{message.length} / 1000</span>
            </label>
            <label className="field"><span>Audience</span><select className="select" value={audience} onChange={(event) => setAudience(event.target.value)}><option value="student">Students</option><option value="guard">Guards</option><option value="all">Everyone</option></select></label>
            <label className="field"><span>Expires (optional)</span><input className="input" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
            <Btn type="submit" variant="primary" icon="megaphone" block>Publish announcement</Btn>
          </div>
        </form>

        <Panel title="Recent announcements" sub={loaded ? `${announcements.length} loaded` : undefined} flush>
          {!loaded ? <SkeletonRows count={3} /> : announcements.length === 0 ? (
            <EmptyState icon="megaphone" title="No announcements yet">Messages you publish will appear here.</EmptyState>
          ) : (
            <div>
              {announcements.map((item) => {
                const expired = item.expires_at !== null && new Date(item.expires_at).getTime() < Date.now();
                return (
                  <article className="ann-item" key={item.id}>
                    <div style={{ minWidth: 0 }}>
                      <div className="ann-top">
                        <Badge tone="brand">{audienceLabel(item.audience)}</Badge>
                        <Badge tone={item.is_active ? "success" : "neutral"} icon={item.is_active ? "circleCheck" : "ban"}>{item.is_active ? "Active" : "Inactive"}</Badge>
                        {expired && <Badge tone="warning" icon="clock">Expired</Badge>}
                      </div>
                      <p className="ann-message">{item.message}</p>
                      <p className="ann-meta">{formatDate(item.created_at)}{item.expires_at ? ` · Expires ${formatDate(item.expires_at)}` : ""}</p>
                    </div>
                    {role === "admin" && (
                      <div className="ann-actions">
                        <Btn size="sm" onClick={() => void toggle(item)}>{item.is_active ? "Deactivate" : "Activate"}</Btn>
                        <Btn variant="danger" size="sm" icon="trash" onClick={() => remove(item)}>Delete</Btn>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Accounts                                                                   */
/* -------------------------------------------------------------------------- */

type AccountsTab = "accounts" | "assignments" | "invitations";
const ACCOUNT_STEP = 25;

function AccountsPage({ accounts, invitations, assignments, zones, loaded, refresh, notify }: { accounts: Account[]; invitations: Invitation[]; assignments: Assignment[]; zones: Zone[]; loaded: boolean; refresh: () => Promise<void>; notify: Notify }) {
  const [tab, setTab] = useState<AccountsTab>("accounts");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("student");
  const [studentId, setStudentId] = useState("");
  const [guardId, setGuardId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [limit, setLimit] = useState(ACCOUNT_STEP);

  useEffect(() => { setLimit(ACCOUNT_STEP); }, [query, roleFilter]);

  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const { data, error } = await supabase.functions.invoke<{ email_sent: boolean }>("invite-account", { body: { email: inviteEmail.trim(), role: inviteRole, student_id: inviteRole === "student" ? studentId.trim() : null } });
    if (error) notify(error.message);
    else { notify(data?.email_sent ? "Staff invitation email sent." : "Student is authorized to sign up with this Student ID and email.", "success"); setInviteEmail(""); setStudentId(""); setInviteOpen(false); await refresh(); }
  };
  const updateAccount = async (account: Account, role: string, isActive: boolean) => {
    if (!supabase) return;
    const { error } = await supabase.rpc("admin_update_user", { p_user_id: account.id, p_role: role, p_is_active: isActive });
    if (error) notify(error.message);
    else { notify("Account access updated.", "success"); await refresh(); }
  };
  const revokeInvitation = async (invitation: Invitation) => {
    if (!supabase) return;
    const { error } = await supabase.from("account_invitations").update({ status: "revoked" }).eq("id", invitation.id);
    if (error) notify(error.message);
    else { notify("Invitation revoked.", "success"); await refresh(); }
  };
  const assignGuard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.from("guard_assignments").insert({ guard_id: guardId, zone_id: Number(zoneId) });
    if (error) notify(error.message);
    else { notify("Guard assigned to zone.", "success"); setGuardId(""); setZoneId(""); setAssignOpen(false); await refresh(); }
  };
  const removeAssignment = async (id: number) => {
    if (!supabase) return;
    const { error } = await supabase.from("guard_assignments").delete().eq("id", id);
    if (error) notify(error.message);
    else { notify("Guard assignment removed.", "success"); await refresh(); }
  };

  const activeGuards = accounts.filter((account) => account.role === "guard" && account.is_active);
  const pendingInvitations = invitations.filter((invitation) => invitation.status === "pending");
  const filteredAccounts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return accounts.filter((account) => {
      if (roleFilter !== "all" && account.role !== roleFilter) return false;
      if (!needle) return true;
      return `${account.full_name ?? ""} ${account.email} ${account.student_id ?? ""}`.toLowerCase().includes(needle);
    });
  }, [accounts, query, roleFilter]);
  const visibleAccounts = filteredAccounts.slice(0, limit);
  const guardName = (id: string) => accounts.find((item) => item.id === id)?.full_name || accounts.find((item) => item.id === id)?.email || id;
  const roleCount = (role: string) => accounts.filter((account) => account.role === role).length;

  const tabs: { id: AccountsTab; label: string; count: number }[] = [
    { id: "accounts", label: "Accounts", count: accounts.length },
    { id: "assignments", label: "Zone assignments", count: assignments.length },
    { id: "invitations", label: "Pending invitations", count: pendingInvitations.length },
  ];

  return (
    <>
      <PageHeader
        title="Accounts & guards"
        subtitle="Invite people, set roles, and assign zone coverage."
        actions={<><Btn icon="mapPin" onClick={() => setAssignOpen(true)}>Assign guard</Btn><Btn variant="primary" icon="userPlus" onClick={() => setInviteOpen(true)}>Invite account</Btn></>}
      />

      <div className="tabs" role="tablist" aria-label="Account management">
        {tabs.map((item) => (
          <button key={item.id} type="button" role="tab" id={`tab-${item.id}`} aria-selected={tab === item.id} aria-controls={`panel-${item.id}`} className="tab" onClick={() => setTab(item.id)}>
            {item.label}<span className="tab-count">{item.count}</span>
          </button>
        ))}
      </div>

      {tab === "accounts" && (
        <div role="tabpanel" id="panel-accounts" aria-labelledby="tab-accounts" className="stack">
          <div className="toolbar">
            <SearchField value={query} onChange={setQuery} placeholder="Search by name, email or student ID" label="Search accounts" />
            <div className="chips" role="group" aria-label="Filter by role">
              <button type="button" className="chip" aria-pressed={roleFilter === "all"} onClick={() => setRoleFilter("all")}>All <span className="chip-count">{accounts.length}</span></button>
              <button type="button" className="chip" aria-pressed={roleFilter === "student"} onClick={() => setRoleFilter("student")}>Students <span className="chip-count">{roleCount("student")}</span></button>
              <button type="button" className="chip" aria-pressed={roleFilter === "guard"} onClick={() => setRoleFilter("guard")}>Guards <span className="chip-count">{roleCount("guard")}</span></button>
              <button type="button" className="chip" aria-pressed={roleFilter === "admin"} onClick={() => setRoleFilter("admin")}>Admins <span className="chip-count">{roleCount("admin")}</span></button>
            </div>
          </div>
          <section className="panel">
            {!loaded ? <SkeletonRows count={5} /> : filteredAccounts.length === 0 ? (
              <EmptyState icon="users" title={accounts.length === 0 ? "No accounts yet" : "No accounts match your filters"} action={accounts.length > 0 ? <Btn onClick={() => { setQuery(""); setRoleFilter("all"); }}>Clear filters</Btn> : undefined}>{accounts.length === 0 ? "Invite people to give them access." : "Try a different name, email or role."}</EmptyState>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="data cards">
                    <thead><tr><th>Name / email</th><th>Student ID</th><th>Role</th><th>Access</th></tr></thead>
                    <tbody>
                      {visibleAccounts.map((account) => (
                        <tr key={account.id}>
                          <td data-label="" className="primary">
                            <div className="cell-person">
                              <Avatar name={account.full_name || account.email} size={34} />
                              <div style={{ minWidth: 0 }}><span className="cell-main">{account.full_name || "—"}</span><span className="cell-sub">{account.email}</span></div>
                            </div>
                          </td>
                          <td data-label="Student ID" className="id-cell">{account.student_id || "—"}</td>
                          <td data-label="Role">
                            <select className="select select-sm" aria-label={`Role for ${account.full_name || account.email}`} value={account.role} onChange={(event) => void updateAccount(account, event.target.value, account.is_active)}>
                              <option value="student">Student</option>
                              <option value="guard">Guard</option>
                              <option value="admin">Administrator</option>
                            </select>
                          </td>
                          <td data-label="Access"><Switch checked={account.is_active} onChange={(checked) => void updateAccount(account, account.role, checked)} label={account.is_active ? "Active" : "Disabled"} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ShowMore shown={visibleAccounts.length} total={filteredAccounts.length} noun="accounts" onMore={() => setLimit((current) => current + ACCOUNT_STEP)} />
              </>
            )}
          </section>
        </div>
      )}

      {tab === "assignments" && (
        <section className="panel" role="tabpanel" id="panel-assignments" aria-labelledby="tab-assignments">
          {!loaded ? <SkeletonRows count={3} /> : assignments.length === 0 ? (
            <EmptyState icon="mapPin" title="No guard assignments" action={<Btn variant="primary" onClick={() => setAssignOpen(true)}>Assign guard</Btn>}>Guards can update occupancy and manage reports in the zones they are assigned to.</EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="data cards">
                <thead><tr><th>Guard</th><th>Zone</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td data-label="" className="primary"><span className="cell-main">{guardName(assignment.guard_id)}</span></td>
                      <td data-label="Zone">{zones.find((item) => item.id === assignment.zone_id)?.name ?? assignment.zone_id}</td>
                      <td data-label=""><div className="cell-actions"><Btn variant="danger" size="sm" icon="trash" onClick={() => void removeAssignment(assignment.id)}>Remove</Btn></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "invitations" && (
        <section className="panel" role="tabpanel" id="panel-invitations" aria-labelledby="tab-invitations">
          {!loaded ? <SkeletonRows count={3} /> : pendingInvitations.length === 0 ? (
            <EmptyState icon="mail" title="No pending invitations" action={<Btn variant="primary" onClick={() => setInviteOpen(true)}>Invite account</Btn>}>Invitations that have not been accepted yet will be listed here.</EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="data cards">
                <thead><tr><th>Email</th><th>Role</th><th>Student ID</th><th>Sent</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {pendingInvitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <td data-label="" className="primary"><span className="cell-main">{invitation.email}</span></td>
                      <td data-label="Role"><Badge>{invitation.role}</Badge></td>
                      <td data-label="Student ID" className="id-cell">{invitation.student_id || "—"}</td>
                      <td data-label="Sent" title={formatDate(invitation.created_at)}>{formatDate(invitation.created_at)}</td>
                      <td data-label=""><div className="cell-actions"><Btn variant="danger" size="sm" onClick={() => void revokeInvitation(invitation)}>Revoke</Btn></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite an account" description="The invitee chooses their password through the secure email flow.">
        <form className="form" onSubmit={invite}>
          <label className="field"><span>Email</span><input className="input" type="email" required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} /></label>
          <label className="field"><span>Role</span><select className="select" value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}><option value="student">Student</option><option value="guard">Guard</option><option value="admin">Administrator</option></select></label>
          {inviteRole === "student" && <label className="field"><span>Student ID</span><input className="input" required inputMode="numeric" pattern="[0-9]{6,20}" value={studentId} onChange={(event) => setStudentId(event.target.value)} /><small className="field-hint">6 to 20 digits.</small></label>}
          <div className="form-actions">
            <Btn onClick={() => setInviteOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary" icon="mail">Send invitation</Btn>
          </div>
        </form>
      </Modal>

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign a guard" description="Guards can update occupancy and manage reports in assigned zones.">
        <form className="form" onSubmit={assignGuard}>
          <label className="field"><span>Guard</span><select className="select" required value={guardId} onChange={(event) => setGuardId(event.target.value)}><option value="">Select a guard</option>{activeGuards.map((guard) => <option value={guard.id} key={guard.id}>{guard.full_name || guard.email}</option>)}</select></label>
          <label className="field"><span>Zone</span><select className="select" required value={zoneId} onChange={(event) => setZoneId(event.target.value)}><option value="">Select a zone</option>{zones.filter((zone) => zone.is_active).map((zone) => <option value={zone.id} key={zone.id}>{zone.name}</option>)}</select></label>
          <div className="form-actions">
            <Btn onClick={() => setAssignOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary">Assign zone</Btn>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  System settings                                                            */
/* -------------------------------------------------------------------------- */

function SettingsPage({ settings, loaded, refresh, notify }: { settings: Setting[]; loaded: boolean; refresh: () => Promise<void>; notify: Notify }) {
  const ask = useAsk();
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
    else { notify("System setting saved.", "success"); setKey(""); setValue("{}"); await refresh(); }
  };
  const remove = (settingKey: string) => {
    ask({
      title: `Delete setting "${settingKey}"?`,
      message: "The app will stop using this value. This cannot be undone.",
      confirmLabel: "Delete setting",
      onConfirm: () => {
        void (async () => {
          if (!supabase) return;
          const { error } = await supabase.from("system_settings").delete().eq("key", settingKey);
          if (error) notify(error.message);
          else { notify("Setting deleted.", "success"); await refresh(); }
        })();
      },
    });
  };

  return (
    <>
      <PageHeader title="System settings" subtitle="Store app-wide settings as JSON values." />
      <div className="split">
        <form className="panel split-sticky" onSubmit={save}>
          <div className="panel-head"><h2 className="panel-title">Add or update a setting</h2></div>
          <div className="panel-body form">
            <label className="field"><span>Key</span><input className="input" required pattern="[a-zA-Z0-9_.\-]+" value={key} onChange={(event) => setKey(event.target.value)} placeholder="parking.notice" /><small className="field-hint">Letters, numbers, dots, dashes and underscores.</small></label>
            <label className="field"><span>JSON value</span><textarea className="textarea code" required rows={6} spellCheck={false} value={value} onChange={(event) => setValue(event.target.value)} /></label>
            <Btn type="submit" variant="primary" icon="check" block>Save setting</Btn>
          </div>
        </form>

        <Panel title="Current settings" sub={loaded ? `${settings.length} ${settings.length === 1 ? "setting" : "settings"}` : undefined} flush>
          {!loaded ? <SkeletonRows count={3} /> : settings.length === 0 ? (
            <EmptyState icon="sliders" title="No settings yet">Settings you add will be listed here.</EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="data cards">
                <thead><tr><th>Key</th><th>Value</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {settings.map((setting) => (
                    <tr key={setting.key}>
                      <td data-label="" className="nowrap primary"><code>{setting.key}</code></td>
                      <td data-label="Value"><code className="trunc" title={JSON.stringify(setting.value)}>{JSON.stringify(setting.value)}</code></td>
                      <td data-label="Updated" className="nowrap" title={formatDate(setting.updated_at)}>{timeAgo(setting.updated_at)}</td>
                      <td data-label="">
                        <div className="cell-actions">
                          <Btn variant="ghost" size="sm" icon="pencil" onClick={() => { setKey(setting.key); setValue(JSON.stringify(setting.value, null, 2)); }}>Edit</Btn>
                          <Btn variant="danger" size="sm" icon="trash" onClick={() => remove(setting.key)}>Delete</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Activity log                                                               */
/* -------------------------------------------------------------------------- */

function DetailChips({ details }: { details: Record<string, unknown> }) {
  const entries = Object.entries(details ?? {});
  if (entries.length === 0) return null;
  return (
    <div className="log-details">
      {entries.map(([name, entryValue]) => (
        <span className="kv" key={name}><b>{name.replaceAll("_", " ")}</b><span>{typeof entryValue === "string" ? entryValue : JSON.stringify(entryValue)}</span></span>
      ))}
    </div>
  );
}

function ActivityPage({ activity, accounts, loaded }: { activity: ActivityEntry[]; accounts: Account[]; loaded: boolean }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(ACCOUNT_STEP);
  useEffect(() => { setLimit(ACCOUNT_STEP); }, [query]);
  const actorOf = useCallback((item: ActivityEntry) => (item.user_id ? accounts.find((account) => account.id === item.user_id)?.email ?? item.user_id : "System"), [accounts]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return activity;
    return activity.filter((item) => `${item.action.replaceAll("_", " ")} ${actorOf(item)} ${JSON.stringify(item.details)}`.toLowerCase().includes(needle));
  }, [activity, actorOf, query]);
  const visible = filtered.slice(0, limit);

  return (
    <>
      <PageHeader title="Activity log" subtitle="Recent administrative and parking operations." />
      {loaded && activity.length > 0 && (
        <div className="toolbar">
          <SearchField value={query} onChange={setQuery} placeholder="Search actions, people or details" label="Search activity" />
          <span className="toolbar-end">{filtered.length} {filtered.length === 1 ? "entry" : "entries"}</span>
        </div>
      )}
      <section className="panel">
        {!loaded ? <SkeletonRows count={5} /> : activity.length === 0 ? (
          <EmptyState icon="history" title="No activity recorded">Administrative and parking operations will be logged here.</EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState icon="search" title="No entries match your search" action={<Btn onClick={() => setQuery("")}>Clear search</Btn>}>Try a different action, person or detail.</EmptyState>
        ) : (
          <>
            <div>
              {visible.map((item) => (
                <article key={item.id} className="log-item">
                  <span className="log-icon"><Icon name="history" size={16} /></span>
                  <div style={{ minWidth: 0 }}>
                    <strong className="log-action">{item.action.replaceAll("_", " ")}</strong>
                    <p className="log-actor">{actorOf(item)}</p>
                    <DetailChips details={item.details} />
                  </div>
                  <span className="log-time" title={formatDate(item.created_at)}>{timeAgo(item.created_at)}</span>
                </article>
              ))}
            </div>
            <ShowMore shown={visible.length} total={filtered.length} noun="entries" onMore={() => setLimit((current) => current + ACCOUNT_STEP)} />
          </>
        )}
      </section>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  My profile                                                                 */
/* -------------------------------------------------------------------------- */

function ProfilePage({ profile, refreshProfile, notify }: { profile: Profile; refreshProfile: () => Promise<void>; notify: Notify }) {
  const [name, setName] = useState(profile.full_name ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const saveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.from("users").update({ full_name: name.trim() || null }).eq("id", profile.id);
    if (error) notify(error.message);
    else { notify("Profile updated.", "success"); await refreshProfile(); }
  };
  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    if (password.length < 8) { notify("Use at least 8 characters for your password."); return; }
    if (password !== confirmPassword) { notify("Passwords do not match."); return; }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) notify(error.message);
    else { notify("Password updated.", "success"); setPassword(""); setConfirmPassword(""); }
  };
  return (
    <>
      <PageHeader title="My profile" subtitle="Manage your staff profile and password." />
      <div className="grid-2">
        <form className="panel" onSubmit={saveName}>
          <div className="panel-head">
            <div className="profile-head">
              <Avatar name={profile.full_name ?? profile.email} size={44} />
              <div><h2>Profile details</h2><p>{profile.role}</p></div>
            </div>
          </div>
          <div className="panel-body form">
            <label className="field"><span>Display name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className="field"><span>Email</span><input className="input" value={profile.email} readOnly /></label>
            <label className="field"><span>Role</span><input className="input" value={profile.role} readOnly /></label>
            <div className="form-actions"><Btn type="submit" variant="primary">Save profile</Btn></div>
          </div>
        </form>
        <form className="panel" onSubmit={savePassword}>
          <div className="panel-head"><h2 className="panel-title">Change password</h2></div>
          <div className="panel-body form">
            <label className="field"><span>New password</span><input className="input" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /><small className="field-hint">At least 8 characters.</small></label>
            <label className="field"><span>Confirm password</span><input className="input" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
            <div className="form-actions"><Btn type="submit" variant="primary">Update password</Btn></div>
          </div>
        </form>
      </div>
    </>
  );
}