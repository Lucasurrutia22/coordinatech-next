import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
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
    const ticketsSubscription = supabase
      .channel('public:tickets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload: any) => {
          if (payload.eventType === 'UPDATE') {
            const { oldRecord, newRecord } = payload;
            if (oldRecord.status !== newRecord.status) {
              const notification: Notification = {
                id: `ticket-${newRecord.id}`,
                type: newRecord.status === 'assigned' ? 'ticket_assigned' : 
                      newRecord.status === 'completed' ? 'ticket_completed' : 'system',
                title: newRecord.status === 'assigned' ? 'Ticket Asignado' : 'Ticket Completado',
                message: `${newRecord.description.substring(0, 50)}...`,
                timestamp: new Date(),
                read: false,
                ticketId: newRecord.id,
              };
              onNotification(notification);
            }
          }
        }
      )
      .subscribe();

    return () => ticketsSubscription.unsubscribe();
  }, [onNotification]);
}

export function useNotificationToast() {
  return useCallback((notification: Notification) => {
    const toastType = notification.type === 'sla_critical' ? 'error' : 
                      notification.type === 'sla_warning' ? 'warning' : 'success';
    toast[toastType](notification.title, { description: notification.message });
  }, []);
}
