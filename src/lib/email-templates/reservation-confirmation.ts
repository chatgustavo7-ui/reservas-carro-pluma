export interface ReservationConfirmationData {
  conductorName: string;
  conductorEmail: string;
  carModel: string;
  carPlate: string;
  startDate: string;
  endDate: string;
  destination: string;
  companions: string[];
  reservationId: string;
}

export function getReservationConfirmationTemplate(data: ReservationConfirmationData): string {
  const companionsText = data.companions.length > 0 
    ? `<p><strong>Acompanhantes:</strong> ${data.companions.join(', ')}</p>`
    : '<p><strong>Acompanhantes:</strong> Nenhum</p>';

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmação de Reserva - Grupo Pluma</title>
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
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        .title {
          font-size: 24px;
          color: #1f2937;
          margin-bottom: 20px;
        }
        .info-section {
          background-color: #f8fafc;
          border-left: 4px solid #2563eb;
          padding: 20px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
        }
        .info-row {
          margin-bottom: 12px;
        }
        .info-row strong {
          color: #374151;
          display: inline-block;
          width: 140px;
        }
        .alert {
          background-color: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
        }
        .alert-title {
          font-weight: bold;
          color: #92400e;
          margin-bottom: 8px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
        .button {
          display: inline-block;
          background-color: #2563eb;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🚗 Grupo Pluma</div>
          <div class="title">Reserva Confirmada!</div>
        </div>
        
        <p>Olá <strong>${data.conductorName}</strong>,</p>
        
        <p>Sua reserva foi confirmada com sucesso! Aqui estão os detalhes:</p>
        
        <div class="info-section">
          <div class="info-row">
            <strong>Veículo:</strong> ${data.carModel}
          </div>
          <div class="info-row">
            <strong>Placa:</strong> ${data.carPlate}
          </div>
          <div class="info-row">
            <strong>Data de Saída:</strong> ${data.startDate}
          </div>
          <div class="info-row">
            <strong>Data de Retorno:</strong> ${data.endDate}
          </div>
          <div class="info-row">
            <strong>Destino:</strong> ${data.destination}
          </div>
          ${companionsText}
          <div class="info-row">
            <strong>ID da Reserva:</strong> #${data.reservationId}
          </div>
        </div>
        
        <div class="alert">
          <div class="alert-title">⚠️ Importante - Lembre-se:</div>
          <ul>
            <li>Informe a quilometragem no momento da devolução</li>
            <li>O veículo ficará indisponível por 2 dias após o retorno</li>
            <li>Mantenha o veículo limpo e em boas condições</li>
          </ul>
        </div>
        
        <p>Em caso de dúvidas ou necessidade de alterações, entre em contato conosco.</p>
        
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