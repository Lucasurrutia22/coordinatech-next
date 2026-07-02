'use client';

import { SLAMetricsPanel } from '@/components/SLAMetricsPanel';
import { BarChart3, SlidersHorizontal } from 'lucide-react';

export default function AdminMetricsSLAPage() {
  return (
    <div className="stack-lg">
      <section className="surface-card p-6 md:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Control de Servicio</p>
            <h1 className="editorial-title mt-2 text-3xl md:text-4xl text-[#111111]">
              Dashboard KPI de SLA
            </h1>
            <p className="mt-2 text-sm text-[#787774] max-w-2xl">
              Monitoreo ejecutivo del nivel de servicio con alertas operativas y foco en
              cumplimiento por prioridad.
            </p>
          </div>

          <div className="surface-card flex items-center gap-3 px-4 py-3">
            <div className="h-8 w-8 rounded-md bg-[#f5f3ee] text-[#111111] grid place-items-center border border-[#EAEAEA]">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="grid gap-0.5">
              <span className="text-[11px] uppercase tracking-[0.08em] text-[#787774]">Meta global</span>
              <span className="text-sm font-semibold text-[#111111]">95% cumplimiento SLA</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-[#787774]">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Estados operativos: Estable, Alerta y Critico para priorizar acciones.</span>
        </div>
      </section>

      <SLAMetricsPanel />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="surface-card p-5">
          <p className="eyebrow">Reglas de servicio</p>
          <h3 className="mt-2 text-base font-semibold text-[#111111]">Ventanas por prioridad</h3>
          <div className="mt-3 grid gap-2 text-sm text-[#2f3437]">
            <p><strong>Alta:</strong> 4 horas</p>
            <p><strong>Media:</strong> 24 horas</p>
            <p><strong>Baja:</strong> 48 horas</p>
          </div>
        </div>

        <div className="surface-card p-5">
          <p className="eyebrow">Umbrales de alerta</p>
          <h3 className="mt-2 text-base font-semibold text-[#111111]">Interpretacion operativa</h3>
          <div className="mt-3 grid gap-2 text-sm text-[#2f3437]">
            <p><strong>Critico:</strong> menos de 15% de tiempo restante.</p>
            <p><strong>Alerta:</strong> menos de 30% de tiempo restante.</p>
            <p><strong>Estable:</strong> 30% o mas de tiempo restante.</p>
          </div>
        </div>
      </section>

      <section className="surface-card p-4 text-sm text-[#787774]">
        Datos actualizados automaticamente cada 30 segundos para monitoreo continuo.
      </section>
    </div>
  );
}
