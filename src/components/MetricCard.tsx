import { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  accent?: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-head">
        <p>{label}</p>
        <div className="metric-icon" style={accent ? { background: accent + "22", color: accent } : undefined}>
          {icon}
        </div>
      </div>
      <p className="metric-value">{value}</p>
      <p className="metric-hint">{hint}</p>
    </article>
  );
}
