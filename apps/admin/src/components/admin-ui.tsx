import type { CSSProperties, ReactNode } from 'react';
import { Search } from 'lucide-react';

export const adminTheme = {
  bg: '#060a12',
  panel: '#0d1524',
  panelBorder: '#1a2636',
  panelInset: '#141f2e',
  text: '#c8d6e5',
  textStrong: '#dce8f5',
  textMuted: '#7a9bb5',
  textSoft: '#3a5068',
  accent: '#d4a853',
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#f87171',
  info: '#7ab3d4',
  violet: '#a78bfa',
};

export const adminTypography = {
  eyebrow: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: adminTheme.textSoft,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: 28,
    color: adminTheme.textStrong,
    letterSpacing: 0.5,
  },
};

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
      <div>
        {eyebrow ? <p style={{ ...adminTypography.eyebrow, marginBottom: 6 }}>{eyebrow}</p> : null}
        <h1 style={adminTypography.title}>{title}</h1>
        {description ? <p style={{ marginTop: 6, color: adminTheme.textMuted, fontSize: 13 }}>{description}</p> : null}
      </div>
      {actions ? <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{actions}</div> : null}
    </div>
  );
}

export function AdminCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: adminTheme.panel,
        border: `1px solid ${adminTheme.panelBorder}`,
        borderRadius: 10,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function AdminStatusChip({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        letterSpacing: 1.5,
        padding: '3px 8px',
        borderRadius: 999,
        background: `${color}18`,
        color,
        border: `1px solid ${color}30`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
}

export function AdminMetricCard({
  label,
  value,
  icon,
  helper,
  accent,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  helper?: string;
  accent?: string;
}) {
  return (
    <AdminCard style={{ padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: '0 0 auto 0',
          height: 2,
          background: `linear-gradient(90deg, ${(accent || adminTheme.accent)}60, transparent)`,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={adminTypography.eyebrow}>{label}</p>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 30,
              fontWeight: 500,
              color: accent || adminTheme.textStrong,
              lineHeight: 1,
              letterSpacing: -1,
              marginTop: 8,
            }}
          >
            {value}
          </p>
          {helper ? <p style={{ marginTop: 10, fontSize: 11, color: adminTheme.textSoft }}>{helper}</p> : null}
        </div>
        {icon ? (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${accent || adminTheme.accent}14`,
              color: accent || adminTheme.accent,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </AdminCard>
  );
}

export function AdminFilterBar({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
      {children}
    </div>
  );
}

export function AdminSearchInput({
  value,
  onChange,
  placeholder,
  width = 320,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  width?: number;
}) {
  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: width }}>
      <Search
        size={13}
        color={adminTheme.textSoft}
        style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: '#060c17',
          border: `1px solid ${adminTheme.panelBorder}`,
          borderRadius: 6,
          padding: '8px 12px 8px 34px',
          color: adminTheme.text,
          fontSize: 13,
          outline: 'none',
        }}
      />
    </div>
  );
}

export function AdminSelect({
  value,
  onChange,
  children,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={{
        background: '#060c17',
        border: `1px solid ${adminTheme.panelBorder}`,
        borderRadius: 6,
        padding: '8px 12px',
        color: adminTheme.text,
        fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace",
        outline: 'none',
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </select>
  );
}

export function AdminTableShell({ children }: { children: ReactNode }) {
  return <AdminCard style={{ overflow: 'hidden' }}>{children}</AdminCard>;
}

export function AdminTableHeadCell({ children }: { children: ReactNode }) {
  return (
    <th
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        color: '#2d4055',
        letterSpacing: 2,
        padding: '11px 16px',
        textAlign: 'left',
        borderBottom: `1px solid ${adminTheme.panelInset}`,
        fontWeight: 500,
      }}
    >
      {children}
    </th>
  );
}

export function AdminTableCell({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <td
      style={{
        padding: '13px 16px',
        borderBottom: `1px solid ${adminTheme.bg}`,
        fontSize: 13,
        color: adminTheme.textMuted,
        verticalAlign: 'middle',
        ...style,
      }}
    >
      {children}
    </td>
  );
}

export function AdminEmptyState({
  title,
  hint,
  icon,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div style={{ textAlign: 'center', padding: 48 }}>
      {icon ? <div style={{ marginBottom: 14 }}>{icon}</div> : null}
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2d4055', letterSpacing: 2 }}>
        {title}
      </p>
      {hint ? <p style={{ marginTop: 8, color: adminTheme.textSoft, fontSize: 12 }}>{hint}</p> : null}
    </div>
  );
}

export function AdminBulkActionBar({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  if (count === 0) {
    return null;
  }

  return (
    <AdminCard
      style={{
        padding: '14px 16px',
        marginBottom: 16,
        borderColor: `${adminTheme.accent}40`,
        background: `${adminTheme.accent}10`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ ...adminTypography.eyebrow, color: adminTheme.accent }}>
          {count} selected for bulk action
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
      </div>
    </AdminCard>
  );
}

export function adminActionButtonStyle(color: string, compact = false): CSSProperties {
  return {
    background: `${color}14`,
    border: `1px solid ${color}30`,
    color,
    borderRadius: 8,
    padding: compact ? '6px 10px' : '9px 14px',
    fontSize: compact ? 11 : 12,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };
}

export function adminTextareaStyle(style?: CSSProperties): CSSProperties {
  return {
    background: '#060c17',
    border: `1px solid ${adminTheme.panelBorder}`,
    borderRadius: 8,
    padding: '10px 12px',
    color: adminTheme.text,
    fontSize: 13,
    outline: 'none',
    width: '100%',
    resize: 'vertical',
    ...style,
  };
}
