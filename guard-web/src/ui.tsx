import { createContext, useContext, useEffect, useId, useRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/*  Icons (inline SVG, 24px grid, 2px stroke)                                  */
/* -------------------------------------------------------------------------- */

export type IconName =
  | "dashboard" | "parking" | "clipboard" | "megaphone" | "users" | "sliders" | "history" | "user"
  | "refresh" | "logout" | "menu" | "x" | "search" | "plus" | "minus" | "trash" | "check"
  | "circleCheck" | "circleX" | "circleAlert" | "triangleAlert" | "info" | "clock" | "loader"
  | "download" | "sun" | "moon" | "car" | "image" | "externalLink" | "mapPin" | "inbox" | "ban"
  | "copy" | "rotateCcw" | "play" | "userPlus" | "lock" | "shield" | "chevronLeft" | "chevronRight"
  | "mail" | "pencil";

const ICONS: Record<IconName, ReactNode> = {
  dashboard: (<><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></>),
  parking: (<><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" /></>),
  clipboard: (<><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></>),
  megaphone: (<><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>),
  users: (<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  sliders: (<><line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" /><line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" /><line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" /><line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" /></>),
  history: (<><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></>),
  user: (<><circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" /></>),
  refresh: (<><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></>),
  logout: (<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></>),
  menu: (<><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></>),
  x: (<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>),
  search: (<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>),
  plus: (<><path d="M5 12h14" /><path d="M12 5v14" /></>),
  minus: (<path d="M5 12h14" />),
  trash: (<><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></>),
  check: (<path d="M20 6 9 17l-5-5" />),
  circleCheck: (<><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>),
  circleX: (<><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></>),
  circleAlert: (<><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></>),
  triangleAlert: (<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></>),
  info: (<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>),
  clock: (<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>),
  loader: (<path d="M21 12a9 9 0 1 1-6.219-8.56" />),
  download: (<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></>),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></>),
  moon: (<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />),
  car: (<><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></>),
  image: (<><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></>),
  externalLink: (<><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>),
  mapPin: (<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>),
  inbox: (<><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>),
  ban: (<><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></>),
  copy: (<><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></>),
  rotateCcw: (<><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></>),
  play: (<polygon points="6 3 20 12 6 21 6 3" />),
  userPlus: (<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" /></>),
  lock: (<><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>),
  shield: (<><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></>),
  chevronLeft: (<path d="m15 18-6-6 6-6" />),
  chevronRight: (<path d="m9 18 6-6-6-6" />),
  mail: (<><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>),
  pencil: (<><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" /></>),
};

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Brand                                                                      */
/* -------------------------------------------------------------------------- */

export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size, fontSize: Math.round(size * 0.58) }} aria-hidden="true">
      P
    </span>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }} aria-hidden="true">
      {(name.trim().slice(0, 1) || "?").toUpperCase()}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Buttons, badges, switches                                                  */
/* -------------------------------------------------------------------------- */

export type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-solid";
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: "sm" | "md";
  icon?: IconName;
  block?: boolean;
};

export function Btn({ variant = "secondary", size = "md", icon, block, className, children, type = "button", ...rest }: BtnProps) {
  const classes = ["btn", `btn-${variant}`, `btn-${size}`, block ? "btn-block" : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <button type={type} className={classes} {...rest}>
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
    </button>
  );
}

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

export function Badge({ tone = "neutral", icon, children }: { tone?: Tone; icon?: IconName; children: ReactNode }) {
  return (
    <span className={`badge badge-${tone}`}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}

export function statusTone(status: string): { tone: Tone; icon: IconName } {
  switch (status) {
    case "Pending": return { tone: "warning", icon: "clock" };
    case "In Progress": return { tone: "info", icon: "loader" };
    case "Resolved": return { tone: "success", icon: "circleCheck" };
    case "Rejected": return { tone: "danger", icon: "circleX" };
    default: return { tone: "neutral", icon: "info" };
  }
}

export function StatusBadge({ status }: { status: string }) {
  const { tone, icon } = statusTone(status);
  return <Badge tone={tone} icon={icon}>{status}</Badge>;
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className="switch-track" aria-hidden="true" />
      <span className="switch-label">{label}</span>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/*  Feedback: alerts, toasts, empty states, skeletons                          */
/* -------------------------------------------------------------------------- */

export type AlertTone = "info" | "success" | "warning" | "error";
const ALERT_ICON: Record<AlertTone, IconName> = { info: "info", success: "circleCheck", warning: "triangleAlert", error: "circleAlert" };

export function Alert({ tone = "info", children, action, onClose, className }: { tone?: AlertTone; children: ReactNode; action?: ReactNode; onClose?: () => void; className?: string }) {
  return (
    <div className={["alert", `alert-${tone}`, className ?? ""].filter(Boolean).join(" ")} role={tone === "error" ? "alert" : "status"}>
      <Icon name={ALERT_ICON[tone]} size={18} className="alert-icon" />
      <div className="alert-body">{children}</div>
      {action}
      {onClose && (
        <button type="button" className="icon-btn icon-btn-sm" onClick={onClose} aria-label="Dismiss message">
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}

export function Toast({ message, tone, onClose }: { message: string; tone: "success" | "error"; onClose: () => void }) {
  return (
    <div className={`toast toast-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon name={tone === "error" ? "circleAlert" : "circleCheck"} size={18} className="toast-icon" />
      <span className="toast-text">{message}</span>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Dismiss notification">
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

export function EmptyState({ icon = "inbox", title, children, action }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon"><Icon name={icon} size={22} /></span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ width = "100%", height = 14 }: { width?: number | string; height?: number | string }) {
  return <span className="skeleton" style={{ width, height }} aria-hidden="true" />;
}

/* -------------------------------------------------------------------------- */
/*  Modal + confirmation dialog (native <dialog>)                              */
/* -------------------------------------------------------------------------- */

export function Modal({ open, onClose, title, description, size = "md", children }: { open: boolean; onClose: () => void; title: string; description?: string; size?: "sm" | "md"; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedOnBackdrop = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      const target =
        dialog.querySelector<HTMLElement>("[data-autofocus]") ??
        dialog.querySelector<HTMLElement>(".modal-body input, .modal-body select, .modal-body textarea");
      target?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`modal modal-${size}`}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onMouseDown={(event) => { pressedOnBackdrop.current = event.target === ref.current; }}
      onClick={(event) => { if (event.target === ref.current && pressedOnBackdrop.current) onClose(); }}
    >
      {open && (
        <div className="modal-card">
          <header className="modal-head">
            <div>
              <h2 id={titleId}>{title}</h2>
              {description && <p>{description}</p>}
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
              <Icon name="x" size={18} />
            </button>
          </header>
          <div className="modal-body">{children}</div>
        </div>
      )}
    </dialog>
  );
}

export type ConfirmOptions = {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
};

export const AskContext = createContext<(options: ConfirmOptions) => void>(() => undefined);
export const useAsk = () => useContext(AskContext);

export function ConfirmDialog({ options, onClose }: { options: ConfirmOptions | null; onClose: () => void }) {
  return (
    <Modal open={options !== null} onClose={onClose} title={options?.title ?? ""} size="sm">
      {options && (
        <>
          <p className="modal-text">{options.message}</p>
          <div className="modal-actions">
            <Btn onClick={onClose} data-autofocus>Cancel</Btn>
            <Btn variant={options.tone === "primary" ? "primary" : "danger-solid"} onClick={() => { onClose(); options.onConfirm(); }}>
              {options.confirmLabel}
            </Btn>
          </div>
        </>
      )}
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Formatting helpers                                                         */
/* -------------------------------------------------------------------------- */

export function timeAgo(value: string): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";
  const seconds = Math.round((Date.now() - time) / 1000);
  if (seconds < 45) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/* -------------------------------------------------------------------------- */
/*  Charts (plain SVG; colours come from CSS tokens)                           */
/* -------------------------------------------------------------------------- */

export type DonutSegment = { label: string; value: number; color: string };

export function StatusDonut({ segments, centerLabel, size = 156 }: { segments: DonutSegment[]; centerLabel: string; size?: number }) {
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const live = segments.filter((segment) => segment.value > 0);
  const gap = live.length > 1 ? 2 : 0;
  let cursor = 0;
  const arcs = live.map((segment) => {
    const length = (segment.value / total) * circumference;
    const start = cursor;
    cursor += length;
    return { ...segment, dash: Math.max(0, length - gap), start };
  });
  const summary = segments.map((segment) => `${segment.label} ${segment.value}`).join(", ");

  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Reports by status: ${summary}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-sunken)" strokeWidth={stroke} />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              className="donut-arc"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              style={{ stroke: arc.color }}
              strokeWidth={stroke}
              strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
              strokeDashoffset={-arc.start}
            >
              <title>{`${arc.label}: ${arc.value}`}</title>
            </circle>
          ))}
        </g>
      </svg>
      <div className="donut-center">
        <strong>{total}</strong>
        <span>{centerLabel}</span>
      </div>
    </div>
  );
}

export type DayCount = { key: string; label: string; full: string; value: number };

export function DailyBars({ days }: { days: DayCount[] }) {
  const width = 320;
  const height = 136;
  const padLeft = 26;
  const padRight = 4;
  const padTop = 16;
  const padBottom = 22;
  const plotHeight = height - padTop - padBottom;
  const plotWidth = width - padLeft - padRight;
  const peak = Math.max(0, ...days.map((day) => day.value));
  const top = Math.max(4, Math.ceil(peak / 2) * 2);
  const slot = plotWidth / days.length;
  const barWidth = Math.min(26, slot - 10);
  const base = padTop + plotHeight;
  const peakIndex = peak > 0 ? days.findIndex((day) => day.value === peak) : -1;
  const lastIndex = days.length - 1;
  const gridLines = [top, top / 2, 0];
  const summary = days.map((day) => `${day.label} ${day.value}`).join(", ");

  return (
    <svg className="bars" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`New reports per day over the last 7 days: ${summary}`}>
      {gridLines.map((value) => {
        const y = base - (value / top) * plotHeight;
        return (
          <g key={value}>
            <line x1={padLeft} x2={width - padRight} y1={y} y2={y} className={value === 0 ? "bars-base" : "bars-grid"} />
            <text x={padLeft - 6} y={y + 4} textAnchor="end" className="bars-tick">{value}</text>
          </g>
        );
      })}
      {days.map((day, index) => {
        const barHeight = (day.value / top) * plotHeight;
        const x = padLeft + slot * index + (slot - barWidth) / 2;
        const radius = Math.min(4, barHeight, barWidth / 2);
        const showValue = day.value > 0 && (index === peakIndex || index === lastIndex);
        return (
          <g key={day.key} className="bar-group">
            {barHeight > 0 && (
              <path
                className="bar"
                d={`M${x},${base} V${base - barHeight + radius} Q${x},${base - barHeight} ${x + radius},${base - barHeight} H${x + barWidth - radius} Q${x + barWidth},${base - barHeight} ${x + barWidth},${base - barHeight + radius} V${base} Z`}
              >
                <title>{`${day.full}: ${day.value} ${day.value === 1 ? "report" : "reports"}`}</title>
              </path>
            )}
            {showValue && <text x={x + barWidth / 2} y={base - barHeight - 5} textAnchor="middle" className="bars-value">{day.value}</text>}
            <text x={x + barWidth / 2} y={height - 6} textAnchor="middle" className="bars-label">{day.label}</text>
          </g>
        );
      })}
    </svg>
  );
}