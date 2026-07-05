'use client';

import { useEffect, useState } from 'react';
import { calculateSLAMetrics, type SLAMetrics } from '@/lib/sla';
import { Ticket } from '@/types/domain';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface SLAIndicatorProps {
  ticket: Ticket;
  compact?: boolean;
}

export function SLAIndicator({ ticket, compact = false }: SLAIndicatorProps) {
  const [sla, setSla] = useState<SLAMetrics | null>(null);

  useEffect(() => {
    const updateSla = () => setSla(calculateSLAMetrics(ticket));
    updateSla();
    const interval = setInterval(updateSla, 1000); // Actualizar cada segundo
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id, ticket.created_at, ticket.ticket_type, ticket.status, ticket.sla_deadline]);

  if (!sla) return null;

  const colors = {
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      badge: 'bg-red-100 text-red-800',
      icon: 'text-red-600',
      progress: 'bg-red-500',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      badge: 'bg-yellow-100 text-yellow-800',
      icon: 'text-yellow-600',
      progress: 'bg-yellow-500',
    },
    ok: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      badge: 'bg-blue-100 text-blue-800',
      icon: 'text-blue-600',
      progress: 'bg-blue-500',
    },
    overdue: {
      bg: 'bg-red-100',
      border: 'border-red-400',
      badge: 'bg-red-200 text-red-900',
      icon: 'text-red-700',
      progress: 'bg-red-700',
    },
    completed: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      badge: 'bg-green-100 text-green-800',
      icon: 'text-green-600',
      progress: 'bg-green-500',
    },
  };

  const colorScheme = colors[sla.level];

  const statusIcons = {
    critical: <AlertCircle className={`w-5 h-5 ${colorScheme.icon}`} />,
    warning: <AlertCircle className={`w-5 h-5 ${colorScheme.icon}`} />,
    ok: <Clock className={`w-5 h-5 ${colorScheme.icon}`} />,
    overdue: <XCircle className={`w-5 h-5 ${colorScheme.icon}`} />,
    completed: <CheckCircle className={`w-5 h-5 ${colorScheme.icon}`} />,
  };

  const statusLabels = {
    critical: '🔴 Crítico',
    warning: '⚠️ Alerta',
    ok: '✓ En Tiempo',
    overdue: '⛔ Vencido',
    completed: '✅ Completado',
  };

  if (compact) {
    return (
      <div className={`px-3 py-2 rounded-lg border ${colorScheme.border} ${colorScheme.bg} flex items-center gap-2`}>
        <div className="flex-shrink-0">{statusIcons[sla.level]}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium ${colorScheme.badge.split(' ')[1]}`}>
            {statusLabels[sla.level]}
          </p>
          <p className={`text-xs font-mono ${colorScheme.badge.split(' ')[1]}`}>
            {sla.hoursRemaining.toFixed(1)}h / {sla.percentRemaining.toFixed(0)}%
          </p>
        </div>
      </div>
    );
  }

  // Versión completa
  return (
    <div className={`border-2 ${colorScheme.border} ${colorScheme.bg} rounded-lg p-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {statusIcons[sla.level]}
          <span className={`font-bold ${colorScheme.badge.split(' ')[1]}`}>
            {statusLabels[sla.level]}
          </span>
        </div>
        <span className={`text-2xl font-bold ${colorScheme.badge.split(' ')[1]}`}>
          {sla.percentRemaining.toFixed(1)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-300 rounded-full h-4 overflow-hidden mb-3">
        <div
          className={`h-full ${colorScheme.progress} rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(sla.percentRemaining, 100)}%` }}
        ></div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-gray-600">Tiempo Restante</p>
          <p className={`font-bold ${colorScheme.badge.split(' ')[1]}`}>
            {sla.hoursRemaining.toFixed(1)}h
          </p>
        </div>
        <div>
          <p className="text-gray-600">Ventana SLA</p>
          <p className="font-bold text-gray-900">{(sla.timeWindowMinutes / 60).toFixed(1)}h</p>
        </div>
        <div>
          <p className="text-gray-600">Estado</p>
          <p className={`font-bold ${colorScheme.badge.split(' ')[1]}`}>
            {sla.level === 'completed' ? 'Listo' : sla.level}
          </p>
        </div>
      </div>
    </div>
  );
}
