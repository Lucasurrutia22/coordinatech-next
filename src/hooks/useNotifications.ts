import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  type: 'ticket_assigned' | 'ticket_completed' | 'sla_critical' | 'sla_warning' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  ticketId?: string;
}

type NotificationCallback = (notification: Notification) => void;

export function useRealtimeNotifications(onNotification: NotificationCallback) {
  useEffect(() => {
    // Suscribirse a cambios en tickets
    const ticketsSubscription = supabase
      .channel('public:tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
        },
        (payload: any) => {
          if (payload.eventType === 'UPDATE') {
            const old = payload.oldRecord;
            const new_data = payload.newRecord;

            // Detectar cambios importantes
            if (old.status !== new_data.status) {
              if (new_data.status === 'assigned') {
                onNotification({
                  id: `ticket-${new_data.id}`,
                  type: 'ticket_assigned',
                  title: 'Ticket Asignado',
                  message: `Nueva orden de servicio asignada: ${new_data.description.substring(0, 50)}...`,
                  timestamp: new Date(),
                  read: false,
                  ticketId: new_data.id,
                });
              } else if (new_data.status === 'completed') {
                onNotification({
                  id: `ticket-${new_data.id}`,
                  type: 'ticket_completed',
                  title: 'Ticket Completado',
                  message: `Orden de servicio finalizada: ${new_data.description.substring(0, 50)}...`,
                  timestamp: new Date(),
                  read: false,
                  ticketId: new_data.id,
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      ticketsSubscription.unsubscribe();
    };
  }, [onNotification]);
}

// Hook para mostrar notificaciones tipo toast
export function useNotificationToast() {
  const showNotification = useCallback((notification: Notification) => {
    // Crear elemento toast
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-4 right-4 z-50 space-y-2';
      document.body.appendChild(container);
    }

    const toastEl = document.createElement('div');
    const bgColor = notification.type === 'sla_critical' 
      ? 'bg-red-500' 
      : notification.type === 'sla_warning'
        ? 'bg-yellow-500'
        : 'bg-blue-500';

    toastEl.className = `${bgColor} text-white px-4 py-3 rounded-lg shadow-lg animate-fade-in-out`;
    toastEl.innerHTML = `
      <div class="font-semibold">${notification.title}</div>
      <div class="text-sm">${notification.message}</div>
    `;

    const container = document.getElementById('toast-container');
    container?.appendChild(toastEl);

    // Remover después de 5 segundos
    setTimeout(() => {
      toastEl.remove();
    }, 5000);
  }, []);

  return showNotification;
}

// Sistema de notificaciones para alertas SLA críticas
export function useSLACriticalAlerts(
  tickets: Array<{ id: string; created_at: string; priority: string; status: string; description: string }>,
  onAlert: NotificationCallback
) {
  const { calculateSLA } = require('@/lib/slaCalculations');

  useEffect(() => {
    // Revisar cada ticket
    tickets.forEach((ticket) => {
      if (ticket.status !== 'completed') {
        const sla = calculateSLA(
          new Date(ticket.created_at),
          ticket.priority,
          ticket.status
        );

        if (sla.status === 'critical') {
          // Mostrar notificación solo una vez por ticket
          const notificationId = `sla-critical-${ticket.id}`;
          const shown = sessionStorage.getItem(notificationId);

          if (!shown) {
            onAlert({
              id: notificationId,
              type: 'sla_critical',
              title: '⚠️ Alerta SLA Crítica',
              message: `Ticket "${ticket.description.substring(0, 40)}..." tiene solo ${sla.hoursRemaining.toFixed(1)}h restantes`,
              timestamp: new Date(),
              read: false,
              ticketId: ticket.id,
            });

            sessionStorage.setItem(notificationId, 'true');
          }
        } else if (sla.status === 'warning') {
          const notificationId = `sla-warning-${ticket.id}`;
          const shown = sessionStorage.getItem(notificationId);

          if (!shown) {
            onAlert({
              id: notificationId,
              type: 'sla_warning',
              title: '⏱️ Alerta SLA Próxima',
              message: `Ticket "${ticket.description.substring(0, 40)}..." tiene ${sla.hoursRemaining.toFixed(1)}h restantes`,
              timestamp: new Date(),
              read: false,
              ticketId: ticket.id,
            });

            sessionStorage.setItem(notificationId, 'true');
          }
        }
      }
    });
  }, [tickets, onAlert]);
}

// Estilos para animaciones CSS (agregar a globals.css)
export const toastStyles = `
@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  10% {
    opacity: 1;
    transform: translateY(0);
  }
  90% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(10px);
  }
}

.animate-fade-in-out {
  animation: fadeInOut 5s ease-in-out;
}
`;
