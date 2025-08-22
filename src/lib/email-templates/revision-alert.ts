export interface RevisionAlertData {
  carModel: string;
  carPlate: string;
  currentKm: number;
  nextRevisionKm: number;
  kmUntilRevision: number;
  lastRevisionDate?: string;
}

export function getRevisionAlertTemplate(data: RevisionAlertData): string {
  const urgencyLevel = data.kmUntilRevision <= 500 ? 'urgent' : 
                      data.kmUntilRevision <= 1000 ? 'warning' : 'info';
  
  const urgencyText = data.kmUntilRevision <= 500 ? 'URGENTE' : 
                     data.kmUntilRevision <= 1000 ? 'ATENÇÃO' : 'AVISO';

  const lastRevisionText = data.lastRevisionDate 
    ? `<div class="info-row"><strong>Última Revisão:</strong> ${data.lastRevisionDate}</div>`
    : '';

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Alerta de Revisão - Grupo Pluma</title>
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
        .urgency-badge {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 20px;
        }
        .urgency-badge.info {
          background-color: #dbeafe;
          color: #1e40af;
          border: 2px solid #3b82f6;
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
        .km-display {
          text-align: center;
          margin: 30px 0;
          padding: 25px;
          border-radius: 12px;
        }
        .km-display.info {
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          border: 2px solid #3b82f6;
        }
        .km-display.warning {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border: 2px solid #f59e0b;
        }
        .km-display.urgent {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          border: 2px solid #dc2626;
        }
        .km-number {
          font-size: 36px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .km-number.info {
          color: #1e40af;
        }
        .km-number.warning {
          color: #92400e;
        }
        .km-number.urgent {
          color: #991b1b;
        }
        .km-label {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
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
        .action-section {
          background-color: #f0f9ff;
          border: 2px solid #0ea5e9;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          text-align: center;
        }
        .action-section.urgent {
          background-color: #fef2f2;
          border-color: #dc2626;
        }
        .maintenance-icon {
          font-size: 48px;
          margin-bottom: 15px;
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
        <div class="header ${urgencyLevel}">
          <div class="logo ${urgencyLevel}">🔧 Grupo Pluma</div>
          <div class="urgency-badge ${urgencyLevel}">${urgencyText}</div>
          <div class="title">Alerta de Revisão</div>
        </div>
        
        <p>Prezado(a) Administrador(a),</p>
        
        <p>O veículo <strong>${data.carModel}</strong> está se aproximando do prazo de revisão obrigatória.</p>
        
        <div class="km-display ${urgencyLevel}">
          <div class="km-number ${urgencyLevel}">${data.kmUntilRevision.toLocaleString('pt-BR')}</div>
          <div class="km-label">quilômetros até a próxima revisão</div>
        </div>
        
        <div class="info-section ${urgencyLevel}">
          <div class="info-row">
            <strong>Veículo:</strong> ${data.carModel}
          </div>
          <div class="info-row">
            <strong>Placa:</strong> ${data.carPlate}
          </div>
          <div class="info-row">
            <strong>KM Atual:</strong> ${data.currentKm.toLocaleString('pt-BR')} km
          </div>
          <div class="info-row">
            <strong>Próxima Revisão:</strong> ${data.nextRevisionKm.toLocaleString('pt-BR')} km
          </div>
          ${lastRevisionText}
        </div>
        
        ${data.kmUntilRevision <= 500 ? `
          <div class="action-section urgent">
            <div class="maintenance-icon">⚠️</div>
            <h3 style="color: #991b1b; margin-bottom: 15px;">Ação Imediata Necessária</h3>
            <p style="color: #991b1b; font-weight: bold;">O veículo deve ser levado para revisão IMEDIATAMENTE. Evite novas reservas até a manutenção ser concluída.</p>
          </div>
        ` : data.kmUntilRevision <= 1000 ? `
          <div class="action-section">
            <div class="maintenance-icon">🔧</div>
            <h3 style="color: #0369a1; margin-bottom: 15px;">Agendar Revisão</h3>
            <p style="color: #0369a1;">Recomendamos agendar a revisão o mais breve possível para evitar indisponibilidade do veículo.</p>
          </div>
        ` : `
          <div class="action-section">
            <div class="maintenance-icon">📅</div>
            <h3 style="color: #0369a1; margin-bottom: 15px;">Planejamento de Manutenção</h3>
            <p style="color: #0369a1;">Mantenha-se atento à quilometragem para planejar a próxima revisão.</p>
          </div>
        `}
        
        <div style="background-color: #f0f9ff; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h4 style="color: #0369a1; margin-top: 0;">📋 Lembrete:</h4>
          <ul style="color: #374151; margin-bottom: 0;">
            <li>Revisões devem ser feitas a cada 10.000 km</li>
            <li>O veículo fica indisponível durante a manutenção</li>
            <li>Atualize o sistema após a conclusão da revisão</li>
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