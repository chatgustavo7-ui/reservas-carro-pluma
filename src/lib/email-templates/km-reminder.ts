export interface KmReminderData {
  conductorName: string;
  carModel: string;
  carPlate: string;
  reservationId: string;
  daysOverdue: number;
  isPickup: boolean; // true para retirada, false para devolução
}

export function getKmReminderTemplate(data: KmReminderData): string {
  const actionText = data.isPickup ? 'retirada' : 'devolução';
  const urgencyClass = data.daysOverdue >= 2 ? 'urgent' : 'warning';
  const urgencyText = data.daysOverdue >= 2 ? 'URGENTE' : 'IMPORTANTE';

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lembrete de Quilometragem - Grupo Pluma</title>
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
          border-bottom: 3px solid #f59e0b;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header.urgent {
          border-bottom-color: #dc2626;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #f59e0b;
          margin-bottom: 10px;
        }
        .logo.urgent {
          color: #dc2626;
        }
        .title {
          font-size: 24px;
          color: #1f2937;
          margin-bottom: 20px;
        }
        .urgency-badge {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 20px;
        }
        .urgency-badge.warning {
          background-color: #fef3c7;
          color: #92400e;
          border: 2px solid #f59e0b;
        }
        .urgency-badge.urgent {
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
          border-left: 4px solid #f59e0b;
          padding: 20px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
        }
        .info-section.urgent {
          border-left-color: #dc2626;
          background-color: #fef2f2;
        }
        .info-row {
          margin-bottom: 12px;
        }
        .info-row strong {
          color: #374151;
          display: inline-block;
          width: 140px;
        }
        .action-required {
          background-color: #dbeafe;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          text-align: center;
        }
        .action-required.urgent {
          background-color: #fee2e2;
          border-color: #dc2626;
        }
        .button {
          display: inline-block;
          background-color: #3b82f6;
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          margin: 15px 0;
          font-size: 16px;
        }
        .button.urgent {
          background-color: #dc2626;
          animation: pulse 2s infinite;
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
        <div class="header ${urgencyClass}">
          <div class="logo ${urgencyClass}">🚗 Grupo Pluma</div>
          <div class="urgency-badge ${urgencyClass}">${urgencyText}</div>
          <div class="title">Quilometragem Pendente</div>
        </div>
        
        <p>Olá <strong>${data.conductorName}</strong>,</p>
        
        <p>Você ainda não informou a quilometragem de <strong>${actionText}</strong> do veículo. Esta informação é obrigatória para o controle da frota.</p>
        
        <div class="info-section ${urgencyClass}">
          <div class="info-row">
            <strong>Veículo:</strong> ${data.carModel}
          </div>
          <div class="info-row">
            <strong>Placa:</strong> ${data.carPlate}
          </div>
          <div class="info-row">
            <strong>Reserva:</strong> #${data.reservationId}
          </div>
          <div class="info-row">
            <strong>Dias em atraso:</strong> ${data.daysOverdue} dia(s)
          </div>
        </div>
        
        <div class="action-required ${urgencyClass}">
          <h3>📋 Ação Necessária</h3>
          <p>Por favor, acesse o sistema e informe a quilometragem de <strong>${actionText}</strong> o mais rápido possível.</p>
          <a href="#" class="button ${urgencyClass}">Informar Quilometragem</a>
        </div>
        
        ${data.daysOverdue >= 2 ? `
          <div style="background-color: #fee2e2; border: 2px solid #dc2626; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="color: #991b1b; font-weight: bold; margin: 0;">⚠️ Este lembrete está sendo enviado há ${data.daysOverdue} dias. A informação da quilometragem é obrigatória para o funcionamento do sistema.</p>
          </div>
        ` : ''}
        
        <p>Em caso de dúvidas, entre em contato com a administração.</p>
        
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