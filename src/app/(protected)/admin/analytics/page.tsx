'use client';

import { AdminAnalyticsDashboard } from '@/components/AdminAnalyticsDashboard';
import { useState } from 'react';
import { Calendar, SlidersHorizontal } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);

  return (
    <div className="stack-lg">
      <section className="surface-card p-6 md:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Centro de Operaciones</p>
            <h1 className="editorial-title mt-2 text-3xl md:text-4xl text-[#111111]">
              Dashboard KPI de Productividad
            </h1>
            <p className="mt-2 text-sm text-[#787774] max-w-2xl">
              Vista ejecutiva de desempeño técnico, eficiencia operativa y señales de riesgo para
              toma de decisiones de coordinación.
            </p>
          </div>

          <div className="surface-card flex items-center gap-3 px-4 py-3">
            <div className="h-8 w-8 rounded-md bg-[#f5f3ee] text-[#111111] grid place-items-center border border-[#EAEAEA]">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="grid gap-0.5">
              <span className="text-[11px] uppercase tracking-[0.08em] text-[#787774]">Periodo</span>
              <select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value, 10))}
                className="bg-transparent text-sm font-semibold text-[#111111] focus:outline-none"
              >
                <option value={7}>Ultimos 7 dias</option>
                <option value={14}>Ultimas 2 semanas</option>
                <option value={30}>Ultimos 30 dias</option>
                <option value={90}>Ultimos 90 dias</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-[#787774]">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>KPIs tacticos actualizados segun ventana temporal seleccionada.</span>
        </div>
      </section>

      <AdminAnalyticsDashboard days={days} />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="surface-card p-5">
          <p className="eyebrow">Definicion KPI</p>
          <h3 className="mt-2 text-base font-semibold text-[#111111]">Eficiencia Operativa</h3>
          <p className="mt-2 text-sm text-[#787774]">
            Porcentaje de tiempo activo sobre tiempo total de ejecucion por tecnico y periodo.
          </p>
        </div>

        <div className="surface-card p-5">
          <p className="eyebrow">Definicion KPI</p>
          <h3 className="mt-2 text-base font-semibold text-[#111111]">Tiempo Activo</h3>
          <p className="mt-2 text-sm text-[#787774]">
            Duracion efectiva de trabajo descontando pausas registradas y tiempos de inactividad.
          </p>
        </div>

        <div className="surface-card p-5">
          <p className="eyebrow">Definicion KPI</p>
          <h3 className="mt-2 text-base font-semibold text-[#111111]">Pausas Registradas</h3>
          <p className="mt-2 text-sm text-[#787774]">
            Conteo y duracion de pausas por tecnico para detectar oportunidades de mejora continua.
          </p>
        </div>
      </section>

      <section className="surface-card p-6">
        <p className="eyebrow">Uso recomendado</p>
        <h2 className="mt-2 text-xl font-semibold text-[#111111]">Lectura rapida para decisiones</h2>
        <div className="mt-4 grid gap-2 text-sm text-[#2f3437]">
          <p><strong>1.</strong> Define el periodo para evaluar tendencia semanal, mensual o trimestral.</p>
          <p><strong>2.</strong> Prioriza tecnicos con estado Critico o Alerta en eficiencia.</p>
          <p><strong>3.</strong> Contrasta pausas por ticket con tiempo medio de ciclo.</p>
          <p><strong>4.</strong> Usa el detalle por tecnico para plan de coaching y balance de carga.</p>
        </div>
      </section>
    </div>
  );
}
