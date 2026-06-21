import { AlertCircle, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

interface SLAAlertBadgeProps {
  timeRemainingPercent: number;
  status: 'critical' | 'warning' | 'ok' | 'completed';
  hoursRemaining: number;
}

export function SLAAlertBadge({ timeRemainingPercent, status, hoursRemaining }: SLAAlertBadgeProps) {
  const getStyles = () => {
    switch (status) {
      case 'critical':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          border: 'border-red-300',
          icon: AlertCircle,
          label: 'Crítico',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          border: 'border-yellow-300',
          icon: AlertTriangle,
          label: 'Alerta',
        };
      case 'ok':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          border: 'border-blue-300',
          icon: Clock,
          label: 'En tiempo',
        };
      case 'completed':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-300',
          icon: CheckCircle,
          label: 'Completado',
        };
    }
  };

  const styles = getStyles();
  const Icon = styles.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border ${styles.bg} ${styles.text} ${styles.border}`}>
      <Icon className="w-4 h-4" />
      <span className="text-xs font-semibold">{styles.label}</span>
      {status !== 'completed' && (
        <span className="text-xs ml-1">({hoursRemaining}h)</span>
      )}
    </div>
  );
}

// Componente para mostrar progreso visual del SLA
export function SLAProgressBar({ percentRemaining }: { percentRemaining: number }) {
  const getBarColor = () => {
    if (percentRemaining <= 15) return 'bg-red-500';
    if (percentRemaining <= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-300 ${getBarColor()}`}
        style={{ width: `${Math.max(percentRemaining, 5)}%` }}
      />
    </div>
  );
}
