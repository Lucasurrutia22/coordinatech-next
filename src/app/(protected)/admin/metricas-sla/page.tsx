'use client';

import { SLAMetricsPanel } from '@/components/SLAMetricsPanel';
import { BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';

export default function AdminMetricsSLAPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Métricas y SLA</h1>
        </div>
        <p className="text-gray-600">
          Panel de control para monitoreo de Acuerdos de Nivel de Servicio (SLA) y KPIs operacionales
        </p>
      </div>

      {/* Banner informativo */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex gap-4">
          <TrendingUp className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-blue-900 mb-2">Sistema de Medición SLA</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ <strong>Verde (≥70%)</strong> - SLA óptimo, dentro del rango esperado</li>
              <li>✓ <strong>Amarillo (50-70%)</strong> - SLA en alerta, requiere atención</li>
              <li>✓ <strong>Rojo (&lt;50%)</strong> - SLA crítico, acción inmediata requerida</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Panel Principal */}
      <SLAMetricsPanel />

      {/* Información adicional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cómo se calcula SLA */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Cálculo de SLA
          </h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <p className="font-medium text-gray-900">Ventanas de Tiempo por Prioridad</p>
              <ul className="mt-2 ml-4 space-y-1">
                <li>🔴 <strong>Alta</strong>: 4 horas</li>
                <li>🟡 <strong>Media</strong>: 24 horas</li>
                <li>🔵 <strong>Baja</strong>: 48 horas</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-gray-900">Estados de Alerta</p>
              <ul className="mt-2 ml-4 space-y-1">
                <li>🔴 <strong>Crítico</strong>: &lt;15% tiempo restante</li>
                <li>🟡 <strong>Alerta</strong>: &lt;30% tiempo restante</li>
                <li>🔵 <strong>En Tiempo</strong>: ≥30% tiempo restante</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Meta de SLA */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Meta de Cumplimiento
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Objetivo Global</p>
              <p className="text-3xl font-bold text-green-600">95%</p>
              <p className="text-xs text-gray-600 mt-1">Cumplimiento mínimo esperado</p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded p-3">
              <p className="text-xs text-green-800">
                <strong>Impacto:</strong> Cada 1% por debajo de meta puede generar pérdidas de $4M CLP mensuales
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer con info de actualización */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-600">
        <p>📊 Los datos se actualizan automáticamente cada 30 segundos</p>
      </div>
    </div>
  );
}
