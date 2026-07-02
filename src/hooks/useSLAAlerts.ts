'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { calculateSLA } from '@/lib/slaCalculations';
import { getStoredJSON, setStoredJSON } from '@/lib/storage';
import { Ticket } from '@/types/domain';

export function useSLAAlerts(tickets: Ticket[]) {
  useEffect(() => {
    let active = true;

    const processAlerts = async () => {
      const stored = await getStoredJSON<string[]>('alerted_sla_tickets', 'session');
      const alertedTickets = new Set(stored ?? []);

      tickets.forEach((ticket) => {
        if (ticket.status === 'completed' || !ticket.created_at) return;

        const sla = calculateSLA(
          new Date(ticket.created_at),
          ticket.priority,
          ticket.status
        );

        if (sla.status === 'critical' && !alertedTickets.has(ticket.id)) {
          toast.error(`⚠️ SLA CRÍTICO - ${ticket.id}`, {
            description: `Solo ${sla.hoursRemaining.toFixed(1)}h restantes`,
          });
          alertedTickets.add(ticket.id);
        } else if (sla.status === 'warning' && !alertedTickets.has(`warn-${ticket.id}`)) {
          toast.warning(`⏱️ SLA Próximo - ${ticket.id}`, {
            description: `${sla.hoursRemaining.toFixed(1)}h restantes`,
          });
          alertedTickets.add(`warn-${ticket.id}`);
        }
      });

      if (active) {
        await setStoredJSON('alerted_sla_tickets', Array.from(alertedTickets), 'session');
      }
    };

    void processAlerts();

    return () => {
      active = false;
    };
  }, [tickets]);
}
