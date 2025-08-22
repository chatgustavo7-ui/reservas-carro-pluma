import React from 'react';
import { AlertTriangle, Wrench, CheckCircle, Clock } from 'lucide-react';
import { useMaintenanceAlerts } from '../hooks/useMaintenanceAlerts';

interface MaintenanceAlertsPanelProps {
  className?: string;
}

export const MaintenanceAlertsPanel: React.FC<MaintenanceAlertsPanelProps> = ({ className = '' }) => {
  const { alerts, isLoading } = useMaintenanceAlerts();

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <Wrench className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Alertas de Manutenção</h3>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const getSeverityStyles = (severity: string, type: string) => {
    if (severity === 'critical') {
      return type === 'revision' 
        ? 'bg-red-50 border-red-200 text-red-800'
        : 'bg-orange-50 border-orange-200 text-orange-800';
    }
    if (severity === 'warning') {
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
    return 'bg-blue-50 border-blue-200 text-blue-800';
  };

  const getSeverityIcon = (severity: string, type: string) => {
    if (severity === 'critical') {
      return type === 'revision' 
        ? <Wrench className="h-5 w-5 text-red-600" />
        : <AlertTriangle className="h-5 w-5 text-orange-600" />;
    }
    if (severity === 'warning') {
      return <Clock className="h-5 w-5 text-yellow-600" />;
    }
    return <CheckCircle className="h-5 w-5 text-blue-600" />;
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <Wrench className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">Alertas de Manutenção</h3>
        {alerts.length > 0 && (
          <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {alerts.length}
          </span>
        )}
      </div>

      <div>
        {alerts.length === 0 ? (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Todos os veículos estão em dia com a manutenção</span>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div
                  key={`${alert.carId}-${alert.type}-${index}`}
                  className={`p-3 rounded-lg border-2 ${getSeverityStyles(alert.severity, alert.type)}`}
                >
                  <div className="flex items-start space-x-3">
                    {getSeverityIcon(alert.severity, alert.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold">
                          {alert.carModel} ({alert.carPlate})
                        </h4>
                        <span className="text-xs font-medium uppercase tracking-wide">
                          {alert.type === 'revision' ? 'REVISÃO' : 'MANUTENÇÃO'}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{alert.message}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-medium">KM Atual:</span>
                          <span className="ml-1">{alert.currentKm.toLocaleString()} km</span>
                        </div>
                        {alert.type === 'revision' ? (
                          <div>
                            <span className="font-medium">Próxima Revisão:</span>
                            <span className="ml-1">{alert.nextRevisionKm.toLocaleString()} km</span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-medium">Próxima Manutenção:</span>
                            <span className="ml-1">{alert.nextMaintenanceKm.toLocaleString()} km</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};

export default MaintenanceAlertsPanel;