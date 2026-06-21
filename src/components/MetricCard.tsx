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

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{cardTitle}</h3>
        <div 
          className="p-2 rounded-lg" 
          style={accent ? { backgroundColor: accent + "22", color: accent } : { backgroundColor: "#eff6ff", color: "#0ea4e9" }}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      {cardHint && (
        <p className={`text-xs font-medium ${
          trend === 'up' ? 'text-green-600' :
          trend === 'down' ? 'text-red-600' :
          'text-gray-500'
        }`}>
          {cardHint}
        </p>
      )}
    </div>
  );
}
