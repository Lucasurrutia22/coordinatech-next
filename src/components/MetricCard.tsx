import { ReactNode } from "react";

export function MetricCard({
  title,
  label,
  value,
  hint,
  icon,
  trend,
  trendValue,
  accent,
}: {
  title?: string;
  label?: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accent?: string;
}) {
  // Support both old and new prop names
  const cardTitle = title || label;
  const cardHint = hint || trendValue;
  const trendClass =
    trend === 'up'
      ? 'text-emerald-700'
      : trend === 'down'
        ? 'text-rose-700'
        : 'text-stone-500';

  return (
    <div className="bg-white rounded-xl border border-[#EAEAEA] p-5">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-stone-600">{cardTitle}</h3>
        <div 
          className="p-2 rounded-md"
          style={accent ? { backgroundColor: accent + '22', color: accent } : { backgroundColor: '#F7F6F3', color: '#2F3437' }}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-semibold text-stone-900 mb-1">{value}</p>
      {cardHint && (
        <p className={`text-xs font-medium ${trendClass}`}>
          {cardHint}
        </p>
      )}
    </div>
  );
}
