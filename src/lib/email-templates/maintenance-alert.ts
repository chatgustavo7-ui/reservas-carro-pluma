export interface MaintenanceAlertData {
  carModel: string;
  carPlate: string;
  maintenanceType: 'revision' | 'repair' | 'scheduled';
  startDate: string;
  estimatedEndDate?: string;
  description: string;
  affectedReservations?: {
    reservationId: string;
    conductorName: string;
    startDate: string;
    endDate: string;
  }[];
}

export function getMaintenanceAlertTemplate(data: MaintenanceAlertData): string {
  const typeLabels = {
    revision: 'Revisão Programada',
    repair: 'Reparo Necessário',
    scheduled: 'Manutenção Agendada'
  };

  const typeIcons = {
    revision: '🔧',
    repair: '⚠️',
    scheduled: '📅'
  };

  const typeColors = {
    revision: 'info',
    repair: 'urgent',
    scheduled: 'warning'
  };

  const typeColor = typeColors[data.maintenanceType];
  const typeLabel = typeLabels[data.maintenanceType];
  const typeIcon = typeIcons[data.maintenanceType];

  const estimatedEndText = data.estimatedEndDate 
    ? `<div class="info-row"><strong>Previsão de Término:</strong> ${data.estimatedEndDate}</div>`
    : '<div class="info-row"><strong>Previsão de Término:</strong> A definir</div>';

  const affectedReservationsSection = data.affectedReservations && data.affectedReservations.length > 0 ? `
    <div class="affected-section">
      <h3>📋 Reservas Afetadas</h3>
      <p>As seguintes reservas serão impactadas e precisam ser reagendadas:</p>
      <div class="reservations-list">
        ${data.affectedReservations.map(reservation => `
          <div class="reservation-item">
            <div class="reservation-header">
              <strong>Reserva #${reservation.reservationId}</strong>
              <span class="conductor-name">${reservation.conductorName}</span>
            </div>
            <div class="reservation-dates">
              ${reservation.startDate} até ${reservation.endDate}
            </div>
          </div>
        `).join('')}
      </div>
      <div class="action-required">
        <p><strong>⚠️ Ação Necessária:</strong> Entre em contato com os condutores para reagendar as reservas.</p>
      </div>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Alerta de Manutenção - Grupo Pluma</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header.info {
          border-bottom: 3px solid #3b82f6;
        }
        .header.warning {
          border-bottom: 3px solid #f59e0b;
        }
        .header.urgent {
          border-bottom: 3px solid #dc2626;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .logo.info {
          color: #3b82f6;
        }
        .logo.warning {
          color: #f59e0b;
        }
        .logo.urgent {
          color: #dc2626;
        }
        .title {
          font-size: 24px;
          color: #1f2937;
          margin-bottom: 20px;
        }
        .maintenance-badge {
          display: inline-block;
          padding: 10px 20px;
          border-radius: 25px;
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 20px;
        }
        .maintenance-badge.info {
          background-color: #dbeafe;
          color: #1e40af;
          border: 2px solid #3b82f6;
        }
        .maintenance-badge.warning {
          background-color: #fef3c7;
          color: #92400e;
          border: 2px solid #f59e0b;
        }
        .maintenance-badge.urgent {
          background-color: #fee2e2;
          color: #991b1b;
          border: 2px solid #dc2626;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .info-section {
          background-color: #f8fafc;
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
        }
        .info-section.info {
          border-left: 4px solid #3b82f6;
        }
        .info-section.warning {
          border-left: 4px solid #f59e0b;
        }
        .info-section.urgent {
          border-left: 4px solid #dc2626;
          background-color: #fef2f2;
        }
        .info-row {
          margin-bottom: 12px;
        }
        .info-row strong {
          color: #374151;
          display: inline-block;
          width: 160px;
        }
        .description-section {
          background-color: #f0f9ff;
          border: 1px solid #0ea5e9;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .description-section.urgent {
          background-color: #fef2f2;
          border-color: #dc2626;
        }
        .affected-section {
          background-color: #fef3c7;
          border: 2px solid #f59e0b;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .affected-section h3 {
          color: #92400e;
          margin-top: 0;
          margin-bottom: 15px;
        }
        .reservations-list {
          margin: 15px 0;
        }
        .reservation-item {
          background-color: white;
          border: 1px solid #d97706;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 10px;
        }
        .reservation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }
        .conductor-name {
          color: #92400e;
          font-weight: 500;
        }
        .reservation-dates {
          color: #6b7280;
          font-size: 14px;
        }
        .action-required {
          background-color: #fed7aa;
          border-radius: 6px;
          padding: 12px;
          margin-top: 15px;
        }
        .action-required p {
          margin: 0;
          color: #9a3412;
        }
        .status-indicator {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 8px;
        }
        .status-indicator.info {
          background-color: #3b82f6;
        }
        .status-indicator.warning {
          background-color: #f59e0b;
        }
        .status-indicator.urgent {
          background-color: #dc2626;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header ${typeColor}">
          <div class="logo ${typeColor}">${typeIcon} Grupo Pluma</div>
          <div class="maintenance-badge ${typeColor}">${typeLabel}</div>
          <div class="title">Veículo em Manutenção</div>
        </div>
        
        <p>Prezado(a) Administrador(a),</p>
        
        <p>Informamos que o veículo <strong>${data.carModel}</strong> entrará em manutenção e ficará temporariamente indisponível para reservas.</p>
        
        <div class="info-section ${typeColor}">
          <div class="info-row">
            <strong>Veículo:</strong> ${data.carModel}
          </div>
          <div class="info-row">
            <strong>Placa:</strong> ${data.carPlate}
          </div>
          <div class="info-row">
            <strong>Tipo de Manutenção:</strong> 
            <span class="status-indicator ${typeColor}"></span>${typeLabel}
          </div>
          <div class="info-row">
            <strong>Data de Início:</strong> ${data.startDate}
          </div>
          ${estimatedEndText}
        </div>
        
        <div class="description-section ${typeColor}">
          <h3>📝 Descrição da Manutenção</h3>
          <p>${data.description}</p>
        </div>
        
        ${affectedReservationsSection}
        
        <div style="background-color: #f0f9ff; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h4 style="color: #0369a1; margin-top: 0;">📋 Próximos Passos:</h4>
          <ul style="color: #374151; margin-bottom: 0;">
            <li>O veículo será marcado como indisponível no sistema</li>
            <li>Novas reservas serão automaticamente bloqueadas</li>
            <li>Atualize o sistema quando a manutenção for concluída</li>
            ${data.affectedReservations && data.affectedReservations.length > 0 ? '<li>Entre em contato com os condutores afetados</li>' : ''}
          </ul>
        </div>
        
        <div class="footer">
          <p><strong>Grupo Pluma</strong><br>
          Sistema de Reservas de Carros<br>
          Este é um e-mail automático, não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}