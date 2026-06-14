import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
  ticketId: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'not_completed';
  technician?: string;
  clientName: string;
  createdAt: Date;
  completedAt?: Date;
  slaCompliancePercent: number;
  evidences?: {
    photoUrl?: string;
    signature?: string;
    gpsCoordinates?: { lat: number; lng: number };
  };
}

export async function generateTicketReportPDF(data: ReportData): Promise<Blob> {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 15;

  // Header con logo/título
  pdf.setFontSize(20);
  pdf.text('CoordinaTech', pageWidth / 2, yPosition, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text('Reporte de Orden de Servicio', pageWidth / 2, yPosition + 8, { align: 'center' });
  pdf.line(15, yPosition + 11, pageWidth - 15, yPosition + 11);

  yPosition += 20;

  // Información del ticket
  pdf.setFontSize(12);
  pdf.setTextColor(0);
  pdf.text('Información del Ticket', 15, yPosition);
  
  yPosition += 7;
  pdf.setFontSize(10);
  
  const ticketInfo = [
    ['ID Ticket:', data.ticketId],
    ['Estado:', data.status.toUpperCase()],
    ['Prioridad:', data.priority.toUpperCase()],
    ['Cumplimiento SLA:', `${data.slaCompliancePercent.toFixed(1)}%`],
  ];

  ticketInfo.forEach(([label, value]) => {
    pdf.text(label, 15, yPosition);
    pdf.text(value, 60, yPosition);
    yPosition += 6;
  });

  yPosition += 5;

  // Información del cliente
  pdf.setFontSize(12);
  pdf.text('Información del Cliente', 15, yPosition);
  
  yPosition += 7;
  pdf.setFontSize(10);
  
  const clientInfo = [
    ['Nombre:', data.clientName],
    ['Descripción:', data.description],
    ['Técnico Asignado:', data.technician || 'No asignado'],
  ];

  clientInfo.forEach(([label, value]) => {
    pdf.text(label, 15, yPosition);
    pdf.text(value, 60, yPosition);
    yPosition += 6;
  });

  yPosition += 5;

  // Fechas
  pdf.setFontSize(12);
  pdf.text('Cronología', 15, yPosition);
  
  yPosition += 7;
  pdf.setFontSize(10);
  
  const dateInfo = [
    ['Creado:', data.createdAt.toLocaleString('es-CL')],
    ['Completado:', data.completedAt?.toLocaleString('es-CL') || 'Pendiente'],
  ];

  dateInfo.forEach(([label, value]) => {
    pdf.text(label, 15, yPosition);
    pdf.text(value, 60, yPosition);
    yPosition += 6;
  });

  // Agregar tabla de evidencias si existen
  if (data.evidences) {
    yPosition += 10;
    pdf.setFontSize(12);
    pdf.text('Evidencias Capturadas', 15, yPosition);
    
    yPosition += 8;
    pdf.setFontSize(10);
    
    if (data.evidences.gpsCoordinates) {
      pdf.text(
        `Ubicación GPS: ${data.evidences.gpsCoordinates.lat.toFixed(4)}, ${data.evidences.gpsCoordinates.lng.toFixed(4)}`,
        15,
        yPosition
      );
      yPosition += 6;
    }

    if (data.evidences.signature) {
      pdf.text('✓ Firma Digital Capturada', 15, yPosition);
      yPosition += 6;
    }

    if (data.evidences.photoUrl) {
      pdf.text('✓ Fotografía Capturada', 15, yPosition);
    }
  }

  // Footer
  yPosition = pageHeight - 15;
  pdf.setFontSize(8);
  pdf.setTextColor(150);
  pdf.line(15, yPosition - 5, pageWidth - 15, yPosition - 5);
  pdf.text(
    `Generado por CoordinaTech - ${new Date().toLocaleString('es-CL')}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );

  return pdf.output('blob');
}

export async function generateDashboardReportPDF(metrics: {
  totalTickets: number;
  completedToday: number;
  slaComplianceRate: number;
  estimatedLossesPrevented: number;
  avgResolutionTime: number;
  criticalAlertsCount: number;
  dateRange: { from: Date; to: Date };
}): Promise<Blob> {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  let yPosition = 15;

  // Header
  pdf.setFontSize(20);
  pdf.text('CoordinaTech', pageWidth / 2, yPosition, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text('Reporte Ejecutivo - Métricas Operacionales', pageWidth / 2, yPosition + 8, { align: 'center' });
  pdf.line(15, yPosition + 11, pageWidth - 15, yPosition + 11);

  yPosition += 20;

  // Período
  pdf.setFontSize(10);
  pdf.setTextColor(0);
  pdf.text(
    `Período: ${metrics.dateRange.from.toLocaleDateString('es-CL')} - ${metrics.dateRange.to.toLocaleDateString('es-CL')}`,
    15,
    yPosition
  );

  yPosition += 10;

  // Tabla de KPIs
  const kpiData = [
    ['Métrica', 'Valor', 'Estado'],
    ['Total de Tickets', metrics.totalTickets.toString(), ''],
    ['Completados Hoy', metrics.completedToday.toString(), '✓'],
    ['Cumplimiento SLA', `${metrics.slaComplianceRate.toFixed(1)}%`, metrics.slaComplianceRate >= 95 ? '✓' : '⚠'],
    ['Tiempo Promedio Resolución', `${metrics.avgResolutionTime.toFixed(1)}h`, ''],
    ['Ahorros Estimados', `$${(metrics.estimatedLossesPrevented / 1000000).toFixed(2)}M`, '✓'],
    ['Alertas Críticas Activas', metrics.criticalAlertsCount.toString(), metrics.criticalAlertsCount === 0 ? '✓' : '🔴'],
  ];

  autoTable(pdf, {
    startY: yPosition,
    head: [kpiData[0]],
    body: kpiData.slice(1),
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 30, halign: 'center' },
    },
  });

  // Footer
  yPosition = pdf.internal.pageSize.getHeight() - 15;
  pdf.setFontSize(8);
  pdf.setTextColor(150);
  pdf.line(15, yPosition - 5, pageWidth - 15, yPosition - 5);
  pdf.text(
    `Generado por CoordinaTech - ${new Date().toLocaleString('es-CL')}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );

  return pdf.output('blob');
}

// Función auxiliar para descargar
export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
