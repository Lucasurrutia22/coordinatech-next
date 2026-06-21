'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, StopCircle, RotateCcw, Clock, Coffee } from 'lucide-react';
import {
  startWorkTimer,
  pauseWorkTimer,
  resumeWorkTimer,
  completeWorkTimer,
  formatDuration,
  getLiveWorkTimer,
} from '@/lib/timeTracking';
import { supabase } from '@/lib/supabase';

// Razones predefinidas de pausa
const PREDEFINED_BREAK_REASONS = [
  { id: 'lunch', label: '🍽️ Colación / Almuerzo', icon: '🍽️' },
  { id: 'travel', label: '🚗 Desplazamiento', icon: '🚗' },
  { id: 'meeting', label: '👥 Reunión', icon: '👥' },
  { id: 'admin', label: '📋 Tareas Administrativas', icon: '📋' },
  { id: 'break', label: '☕ Descanso', icon: '☕' },
  { id: 'other', label: '✏️ Otro', icon: '✏️' },
];

interface WorkTimerProps {
  ticketId: string;
  technicianId: string;
  userRole?: 'admin' | 'technician' | 'user';
  onWorkStarted?: () => void;
  onWorkPaused?: () => void;
  onWorkCompleted?: () => void;
  compact?: boolean;
}

export function WorkTimer({
  ticketId,
  technicianId,
  userRole = 'technician',
  onWorkStarted,
  onWorkPaused,
  onWorkCompleted,
  compact = false,
}: WorkTimerProps) {
  const [state, setState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [breakReasonInput, setBreakReasonInput] = useState('');
  const [selectedBreakReason, setSelectedBreakReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBreakReasonModal, setShowBreakReasonModal] = useState(false);
  // Modal de finalización removido - cerrar ticket solo desde tickets/[id]/page.tsx
  const [currentBreakReason, setCurrentBreakReason] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar estado actual y configurar polling
  useEffect(() => {
    const loadState = async () => {
      try {
        const timer = await getLiveWorkTimer(ticketId);
        if (timer.isRunning) {
          setState('running');
          setElapsedMs(timer.elapsedMs);
        }
      } catch (err) {
        console.error('Error loading timer state:', err);
      }
    };
    
    loadState();
    
    // Polling cada 5 segundos para sincronizar estado
    pollIntervalRef.current = setInterval(async () => {
      try {
        const timer = await getLiveWorkTimer(ticketId);
        setElapsedMs(timer.elapsedMs);
        
        // Verificar si hay un break activo
        const { data: activeBreak, error } = await supabase
          .from('work_breaks')
          .select('break_reason')
          .eq('ticket_id', ticketId)
          .is('break_end', null)
          .limit(1);
        
        if (error) {
          console.error('Error fetching break status:', error);
          return;
        }
        
        if (activeBreak && activeBreak.length > 0) {
          setState('paused');
          setCurrentBreakReason(activeBreak[0].break_reason || 'Pausa sin especificar');
        } else {
          // No hay break activo, si estaba pausado, cambiar a running
          if (timer.isRunning) {
            setState('running');
            setCurrentBreakReason(null);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000);
    
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [ticketId]);

  // Actualizar cronómetro cada 100ms
  useEffect(() => {
    if (state === 'running') {
      intervalRef.current = setInterval(() => {
        setElapsedMs(prev => prev + 100);
      }, 100);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state]);

  const handleStart = async () => {
    try {
      setLoading(true);
      await startWorkTimer(ticketId, technicianId);
      setState('running');
      setElapsedMs(0);
      onWorkStarted?.();
    } catch (err) {
      console.error('Error starting timer:', err);
      alert('Error iniciando cronómetro');
    } finally {
      setLoading(false);
    }
  };

  const handlePauseClick = () => {
    setShowBreakReasonModal(true);
    setSelectedBreakReason(null);
    setBreakReasonInput('');
  };

  const handlePause = async () => {
    if (!selectedBreakReason) {
      alert('Selecciona un motivo de pausa');
      return;
    }

    try {
      setLoading(true);
      const reasonText = selectedBreakReason === 'other' 
        ? breakReasonInput 
        : PREDEFINED_BREAK_REASONS.find(r => r.id === selectedBreakReason)?.label || selectedBreakReason;
      
      await pauseWorkTimer(ticketId, technicianId, reasonText);
      setState('paused');
      setCurrentBreakReason(reasonText);
      setShowBreakReasonModal(false);
      setBreakReasonInput('');
      setSelectedBreakReason(null);
      onWorkPaused?.();
    } catch (err) {
      console.error('Error pausing timer:', err);
      alert('Error pausando cronómetro');
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setLoading(true);
      await resumeWorkTimer(ticketId, technicianId);
      setState('running');
      setCurrentBreakReason(null);
      onWorkPaused?.();
    } catch (err) {
      console.error('Error resuming timer:', err);
      alert('Error reanudando cronómetro');
    } finally {
      setLoading(false);
    }
  };

  // Finalización removida - debe hacerse desde buttons en tickets/[id]/page.tsx

  const duration = formatDuration(elapsedMs);

  if (compact) {
    return (
      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
        {userRole === 'admin' && (
          <>
            <div className="text-3xl font-mono font-bold text-blue-600 mb-3">
              {duration.formatted}
            </div>
            {state === 'paused' && currentBreakReason && (
              <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
                <strong>Pausado:</strong> {currentBreakReason}
              </div>
            )}
          </>
        )}
        <div className="flex gap-2 justify-center">
          {state === 'idle' && (
            <button
              onClick={handleStart}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Iniciar
            </button>
          )}
          {state === 'running' && (
            <button
              onClick={handlePauseClick}
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded flex items-center gap-2"
            >
              <Pause className="w-4 h-4" />
              Pausar
            </button>
          )}
          {state === 'paused' && (
            <button
              onClick={handleResume}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Reanudar
            </button>
          )}
        </div>

        {/* Modal para razón de break */}
        {showBreakReasonModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">¿Por qué pausas el trabajo?</h3>
              
              {/* Razones predefinidas */}
              <div className="space-y-2 mb-4">
                {PREDEFINED_BREAK_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => {
                      setSelectedBreakReason(reason.id);
                      if (reason.id !== 'other') {
                        setBreakReasonInput('');
                      }
                    }}
                    className={`w-full p-3 rounded-lg border-2 transition text-left ${
                      selectedBreakReason === reason.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">{reason.label}</span>
                  </button>
                ))}
              </div>

              {/* Campo de texto para razón personalizada */}
              {selectedBreakReason === 'other' && (
                <textarea
                  value={breakReasonInput}
                  onChange={e => setBreakReasonInput(e.target.value)}
                  placeholder="Describe el motivo de la pausa..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  rows={3}
                  autoFocus
                />
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowBreakReasonModal(false);
                    setSelectedBreakReason(null);
                    setBreakReasonInput('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePause}
                  disabled={loading || !selectedBreakReason || (selectedBreakReason === 'other' && !breakReasonInput.trim())}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded"
                >
                  Pausar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Versión completa (no compacta)
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-8 shadow-lg">
      <h2 className="text-2xl font-bold text-blue-900 mb-6">Cronómetro de Trabajo</h2>

      {/* Display del tiempo */}
      <div className="bg-white rounded-lg p-8 mb-6 border border-gray-200 shadow-inner">
        <div className="text-center">
          <p className="text-gray-600 text-sm mb-2">Tiempo Total</p>
          <div className="text-6xl font-mono font-bold text-blue-600 tracking-widest">
            {duration.formatted}
          </div>
          <div className="grid grid-cols-4 gap-2 mt-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-900">{duration.hours}</div>
              <div className="text-gray-600">Horas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-900">{duration.minutes}</div>
              <div className="text-gray-600">Minutos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-900">{duration.seconds}</div>
              <div className="text-gray-600">Segundos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-900">{duration.milliseconds}</div>
              <div className="text-gray-600">Ms</div>
            </div>
          </div>
        </div>
      </div>

      {/* Estado actual */}
      <div className="mb-6 p-3 bg-white rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">Estado</p>
        <p className="text-lg font-semibold">
          {state === 'idle' && '⏹️ No iniciado'}
          {state === 'running' && '▶️ En progreso'}
          {state === 'paused' && '⏸️ En pausa'}
        </p>
      </div>

      {/* Botones de control */}
      <div className="flex gap-3 flex-wrap">
        {state === 'idle' && (
          <button
            onClick={handleStart}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2 text-lg"
          >
            <Play className="w-6 h-6" />
            Iniciar Trabajo
          </button>
        )}

        {state === 'running' && (
          <button
            onClick={handlePauseClick}
            disabled={loading}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Pause className="w-6 h-6" />
            Pausar
          </button>
        )}

        {state === 'paused' && (
          <button
            onClick={handleResume}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Play className="w-6 h-6" />
            Reanudar
          </button>
        )}
      </div>

      {/* Modal para razón de break */}
      {showBreakReasonModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-white to-slate-50 p-8 rounded-xl shadow-2xl max-w-md max-h-[90vh] overflow-y-auto border border-slate-200">
            <h3 className="text-2xl font-bold mb-6 text-slate-900">¿Por qué pausas el trabajo?</h3>
            
            {/* Razones predefinidas */}
            <div className="space-y-3 mb-6">
              {PREDEFINED_BREAK_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => {
                    setSelectedBreakReason(reason.id);
                    if (reason.id !== 'other') {
                      setBreakReasonInput('');
                    }
                  }}
                  className={`w-full p-4 rounded-lg border-2 transition text-left font-medium text-base ${
                    selectedBreakReason === reason.id
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-slate-200 hover:border-blue-300 bg-white hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  {reason.label}
                </button>
              ))}
            </div>

            {/* Campo de texto para razón personalizada */}
            {selectedBreakReason === 'other' && (
              <textarea
                value={breakReasonInput}
                onChange={e => setBreakReasonInput(e.target.value)}
                placeholder="Describe el motivo de la pausa..."
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder-slate-400"
                rows={4}
                autoFocus
              />
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBreakReasonModal(false);
                  setSelectedBreakReason(null);
                  setBreakReasonInput('');
                }}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-3 px-4 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handlePause}
                disabled={loading || !selectedBreakReason || (selectedBreakReason === 'other' && !breakReasonInput.trim())}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-400 text-white font-semibold py-3 px-4 rounded-lg transition"
              >
                {loading ? 'Pausando...' : 'Pausar Ahora'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de finalización removido - cerrar desde tickets/[id]/page.tsx */}
    </div>
  );
}
