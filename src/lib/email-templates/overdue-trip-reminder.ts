export interface OverdueTripReminderData {
  conductorName: string;
  conductorEmail: string;
  carModel: string;
  carPlate: string;
  reservationId: string;
  returnDate: string;
  daysOverdue: number;
  reminderCount: number;
  systemUrl?: string;
}

export function getOverdueTripReminderTemplate(data: OverdueTripReminderData): string {
  const urgencyLevel = data.daysOverdue >= 7 ? 'critical' : data.daysOverdue >= 3 ? 'urgent' : 'warning';
  const urgencyColor = urgencyLevel === 'critical' ? '#dc2626' : urgencyLevel === 'urgent' ? '#f59e0b' : '#3b82f6';
  const urgencyText = urgencyLevel === 'critical' ? 'CRÍTICO' : urgencyLevel === 'urgent' ? 'URGENTE' : 'ATENÇÃO';
  const reminderText = data.reminderCount > 1 ? `(${data.reminderCount}º lembrete)` : '';

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Viagem Não Finalizada - Grupo Pluma</title>
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
          padding: 0;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, ${urgencyColor} 0%, ${urgencyLevel === 'critical' ? '#991b1b' : urgencyLevel === 'urgent' ? '#d97706' : '#1e40af'} 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .urgency-badge {
          display: inline-block;
          background-color: rgba(255, 255, 255, 0.2);
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 10px;
          border: 2px solid rgba(255, 255, 255, 0.3);
        }
        .title {
          font-size: 24px;
          margin: 0;
          font-weight: 300;
        }
        .content {
          padding: 30px 20px;
        }
        .alert-banner {
          background-color: ${urgencyColor};
          color: white;
          padding: 15px;
          text-align: center;
          font-weight: bold;
          font-size: 16px;
        }
        .info-section {
          background-color: #f8fafc;
          border-left: 4px solid ${urgencyColor};
          padding: 20px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
        }
        .info-row {
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .info-label {
          font-weight: bold;
          color: #374151;
          min-width: 120px;
        }
        .info-value {
          color: #1f2937;
          text-align: right;
        }
        .action-required {
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          border: 2px solid ${urgencyColor};
          border-radius: 12px;
          padding: 25px;
          margin: 25px 0;
          text-align: center;
        }
        .action-title {
          color: ${urgencyColor};
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 15px;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, ${urgencyColor} 0%, ${urgencyLevel === 'critical' ? '#991b1b' : urgencyLevel === 'urgent' ? '#d97706' : '#1e40af'} 100%);
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 25px;
          font-weight: bold;
          margin: 15px 0;
          font-size: 16px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }
        .warning-box {
          background-color: #fef3c7;
          border: 2px solid #f59e0b;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .critical-warning {
          background-color: #fee2e2;
          border: 2px solid #dc2626;
          color: #991b1b;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          border-top: 1px solid #dee2e6;
          color: #6c757d;
          font-size: 14px;
        }
        .pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🚗 Grupo Pluma</div>
          <div class="urgency-badge ${urgencyLevel === 'critical' ? 'pulse' : ''}">
            ${urgencyText} ${reminderText}
          </div>
          <div class="title">Viagem Não Finalizada</div>
        </div>
        
        <div class="alert-banner ${urgencyLevel === 'critical' ? 'pulse' : ''}">
          ⚠️ Viagem em atraso há ${data.daysOverdue} dia(s) - Ação necessária
        </div>
        
        <div class="content">
          <h2 style="color: #333; margin-top: 0; font-size: 24px;">Olá, ${data.conductorName}! 👋</h2>
          
          <p style="font-size: 16px; margin-bottom: 25px; color: #555;">
            Sua viagem com o veículo <strong>${data.carModel}</strong> ainda não foi finalizada no sistema. 
            A data de devolução prevista era <strong>${data.returnDate}</strong> e já se passaram 
            <strong style="color: ${urgencyColor};">${data.daysOverdue} dia(s)</strong>.
          </p>
          
          <div class="info-section">
            <div class="info-row">
              <span class="info-label">🚗 Veículo:</span>
              <span class="info-value">${data.carModel}</span>
            </div>
            <div class="info-row">
              <span class="info-label">🏷️ Placa:</span>
              <span class="info-value">${data.carPlate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">📋 Reserva:</span>
              <span class="info-value">#${data.reservationId}</span>
            </div>
            <div class="info-row">
              <span class="info-label">📅 Data de Devolução:</span>
              <span class="info-value">${data.returnDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">⏰ Dias em Atraso:</span>
              <span class="info-value" style="color: ${urgencyColor}; font-weight: bold;">${data.daysOverdue} dia(s)</span>
            </div>
          </div>
          
          <div class="action-required">
            <div class="action-title">📝 Finalização Obrigatória</div>
            <p style="margin-bottom: 20px; color: #555; font-size: 16px;">
              Para finalizar sua viagem, você precisa informar a <strong>quilometragem final</strong> do veículo no sistema.
            </p>
            ${data.systemUrl ? `
              <a href="${data.systemUrl}" class="button">
                🚗 Finalizar Viagem Agora
              </a>
            ` : ''}
          </div>
          
          ${data.daysOverdue >= 3 ? `
            <div class="warning-box ${data.daysOverdue >= 7 ? 'critical-warning' : ''}">
              <h4 style="margin-top: 0; color: ${data.daysOverdue >= 7 ? '#991b1b' : '#92400e'}; font-size: 16px;">
                ${data.daysOverdue >= 7 ? '🚨 Situação Crítica' : '⚠️ Atenção Especial'}
              </h4>
              <p style="margin-bottom: 0; color: ${data.daysOverdue >= 7 ? '#991b1b' : '#92400e'};">
                ${data.daysOverdue >= 7 
                  ? 'Esta viagem está em atraso há mais de uma semana. A finalização é obrigatória e urgente para o controle da frota.' 
                  : 'A informação da quilometragem é obrigatória para o funcionamento do sistema de reservas.'}
              </p>
            </div>
          ` : ''}
          
          <div style="background-color: #e0f2fe; border-left: 4px solid #0288d1; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <h4 style="margin-top: 0; color: #01579b; font-size: 16px;">💡 Como Finalizar:</h4>
            <ol style="margin: 10px 0; padding-left: 20px; color: #01579b;">
              <li>Acesse o sistema de reservas</li>
              <li>Localize sua reserva ativa</li>
              <li>Clique em "Informar KM de Devolução"</li>
              <li>Digite a quilometragem atual do veículo</li>
              <li>Confirme a finalização</li>
            </ol>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 25px;">
            Em caso de dúvidas ou problemas técnicos, entre em contato com a administração imediatamente.
          </p>
        </div>
        
        <div class="footer">
          <p style="margin: 0;"><strong>Grupo Pluma</strong><br>
          Sistema Automatizado de Reservas de Carros</p>
          <p style="margin: 10px 0 0 0; color: #adb5bd; font-size: 12px;">
            Este é um lembrete automático enviado ${data.reminderCount > 1 ? `pela ${data.reminderCount}ª vez` : 'pela primeira vez'}.<br>
            Enviado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}