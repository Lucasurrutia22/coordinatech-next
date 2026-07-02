import { ReactNode } from "react";
import clsx from "clsx";

export function MetricCard({
  title,
  label,
  value,
  hint,
  icon,
  trend,
  trendValue,
  accent,
  className,
}: {
  title?: string;
  label?: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accent?: string;
  className?: string;
}) {
  // Support both old and new prop names
  const cardTitle = title || label;
  const cardHint = hint || trendValue;
  const trendClass =
    trend === 'up'
      ? 'text-[#346538]'
      : trend === 'down'
        ? 'text-[#9f2f2d]'
        : 'text-[#787774]';

  return (
    <div className={clsx("metric-card surface-card", className)}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-medium text-[#2f3437] tracking-[0.01em]">{cardTitle}</h3>
        <div 
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#EAEAEA]"
          style={accent ? { backgroundColor: accent + '14', color: accent } : { backgroundColor: '#F7F6F3', color: '#111111' }}
        >
          {icon}
        </div>
      </div>
      <p className="text-[2rem] font-semibold tracking-[-0.03em] text-[#111111] mb-1">{value}</p>
      {cardHint && (
        <p className={clsx("text-xs font-medium", trendClass)}>
          {cardHint}
        </p>
      )}
    </div>
  );
}
