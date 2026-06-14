'use client';

import { useMemo, useEffect, useState } from 'react';
import { calculateSLA } from '@/lib/slaCalculations';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface SLAIndicatorProps {
  ticketId: string;
  createdAt: string;
  priority: string;
  status: string;
  compact?: boolean;
}

export function SLAIndicator({
  ticketId,
  createdAt,
  priority,
  status,
  compact = false,
}: SLAIndicatorProps) {
  const [sla, setSla] = useState<any>(null);

  useEffect(() => {
    const updateSla = () => {
      const slaData = calculateSLA(new Date(createdAt), priority, status);
      setSla(slaData);
    };

    updateSla();
    const interval = setInterval(updateSla, 1000); // Actualizar cada segundo
    return () => clearInterval(interval);
  }, [createdAt, priority, status]);

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
    completed: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      badge: 'bg-green-100 text-green-800',
      icon: 'text-green-600',
      progress: 'bg-green-500',
    },
  };

  const colorScheme = colors[sla.status];

  const statusIcons = {
    critical: <AlertCircle className={`w-5 h-5 ${colorScheme.icon}`} />,
    warning: <AlertCircle className={`w-5 h-5 ${colorScheme.icon}`} />,
    ok: <Clock className={`w-5 h-5 ${colorScheme.icon}`} />,
    completed: <CheckCircle className={`w-5 h-5 ${colorScheme.icon}`} />,
  };

  const statusLabels = {
    critical: '🔴 Crítico',
    warning: '⚠️ Alerta',
    ok: '✓ En Tiempo',
    completed: '✅ Completado',
  };

  if (compact) {
    return (
      <div className={`px-3 py-2 rounded-lg border ${colorScheme.border} ${colorScheme.bg} flex items-center gap-2`}>
        <div className="flex-shrink-0">{statusIcons[sla.status]}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium ${colorScheme.badge.split(' ')[1]}`}>
            {statusLabels[sla.status]}
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
          {statusIcons[sla.status]}
          <span className={`font-bold ${colorScheme.badge.split(' ')[1]}`}>
            {statusLabels[sla.status]}
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
          <p className="font-bold text-gray-900">{sla.timeWindow}h</p>
        </div>
        <div>
          <p className="text-gray-600">Estado</p>
          <p className={`font-bold ${colorScheme.badge.split(' ')[1]}`}>
            {sla.status === 'completed' ? 'Listo' : sla.status}
          </p>
        </div>
      </div>
    </div>
  );
}
