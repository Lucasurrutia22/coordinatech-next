'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { WorkTimer } from '@/components/WorkTimer';
import { WorkTimeSummaryView } from '@/components/WorkTimeSummaryView';
import { SLAAlertBadge } from '@/components/SLAAlertBadge';
import { EvidenceCapture } from '@/components/EvidenceCapture';
import { calculateSLA } from '@/lib/slaCalculations';
import { Clock, AlertTriangle } from 'lucide-react';

interface Ticket {
  id: string;
  description: string;
  priority: string;
  status: string;
  client_name: string;
  technician_id: string;
  created_at: string;
  work_started_at?: string;
  work_ended_at?: string;
}

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [technician, setTechnician] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [slaStatus, setSlaStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'work-timer' | 'summary' | 'evidence'>('work-timer');

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  useEffect(() => {
    if (ticket) {
      // Calcular SLA en tiempo real
      const sla = calculateSLA(
        new Date(ticket.created_at),
        ticket.priority,
        ticket.status
      );
      setSlaStatus(sla);

      // Actualizar cada segundo
      const interval = setInterval(() => {
        const updatedSla = calculateSLA(
          new Date(ticket.created_at),
          ticket.priority,
          ticket.status
        );
        setSlaStatus(updatedSla);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [ticket]);

  async function loadTicket() {
    try {
      setLoading(true);

      // Obtener ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (ticketError) throw ticketError;
      setTicket(ticketData);

      // Obtener técnico
      if (ticketData.technician_id) {
        const { data: techData, error: techError } = await supabase
          .from('technicians')
          .select('id, name')
          .eq('id', ticketData.technician_id)
          .single();

        if (!techError) {
          setTechnician(techData);
        }
      }
    } catch (err) {
      console.error('Error loading ticket:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">No se encontró el ticket</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con información del ticket */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{ticket.description}</h1>
            <p className="text-gray-600 mt-1">Ticket ID: {ticketId}</p>
          </div>
          {slaStatus && (
            <SLAAlertBadge
              status={slaStatus.status}
              timeRemainingPercent={slaStatus.percentRemaining}
              hoursRemaining={slaStatus.hoursRemaining}
            />
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-600 mb-1">Cliente</p>
            <p className="font-medium text-gray-900">{ticket.client_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Técnico</p>
            <p className="font-medium text-gray-900">{technician?.name || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Prioridad</p>
            <p className="font-medium text-gray-900 uppercase">{ticket.priority}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Estado</p>
            <p className="font-medium text-gray-900 uppercase">{ticket.status}</p>
          </div>
        </div>
      </div>

      {/* Alerta SLA si está crítico */}
      {slaStatus && slaStatus.status === 'critical' && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-800">⚠️ Alerta SLA Crítica</h3>
            <p className="text-red-700 text-sm mt-1">
              Solo quedan {slaStatus.hoursRemaining.toFixed(1)} horas para completar este trabajo.
              Se requiere acción inmediata para evitar incumplimiento de SLA.
            </p>
          </div>
        </div>
      )}

      {/* Tabs de contenido */}
      <div className="border-b border-gray-200 flex gap-4">
        <button
          onClick={() => setActiveTab('work-timer')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'work-timer'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Cronómetro
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'summary'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Resumen de Tiempos
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'evidence'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Evidencias
        </button>
      </div>

      {/* Contenido según tab */}
      {activeTab === 'work-timer' && technician && (
        <WorkTimer
          ticketId={ticketId}
          technicianId={technician.id}
          onWorkStarted={() => loadTicket()}
          onWorkCompleted={() => loadTicket()}
        />
      )}

      {activeTab === 'summary' && (
        <WorkTimeSummaryView ticketId={ticketId} showDetails={true} />
      )}

      {activeTab === 'evidence' && technician && (
        <EvidenceCapture
          ticketId={ticketId}
          onSave={async evidence => {
            // Guardar evidencia en ticket
            await supabase
              .from('tickets')
              .update({ evidence })
              .eq('id', ticketId);
          }}
        />
      )}
    </div>
  );
}
