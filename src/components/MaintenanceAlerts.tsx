import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, Wrench, Info } from 'lucide-react';
import { useMaintenanceAlerts } from '@/hooks/useMaintenanceAlerts';
import { cn } from '@/lib/utils';

interface MaintenanceAlertsProps {
  className?: string;
  showDismissButton?: boolean;
}

export function MaintenanceAlerts({ className, showDismissButton = true }: MaintenanceAlertsProps) {
  const { alerts, loading, dismissAlert, getCriticalAlertsCount, getWarningAlertsCount } = useMaintenanceAlerts();

  if (loading || alerts.length === 0) {
    return null;
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <Wrench className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Resumo dos alertas */}
      {(getCriticalAlertsCount() > 0 || getWarningAlertsCount() > 0) && (
        <div className="flex items-center space-x-2 mb-3">
          <Wrench className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-700">Alertas de Manutenção:</span>
          {getCriticalAlertsCount() > 0 && (
            <Badge className="bg-red-100 text-red-800">
              {getCriticalAlertsCount()} crítico{getCriticalAlertsCount() > 1 ? 's' : ''}
            </Badge>
          )}
          {getWarningAlertsCount() > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800">
              {getWarningAlertsCount()} aviso{getWarningAlertsCount() > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      )}

      {/* Lista de alertas */}
      {alerts.map((alert) => (
        <Alert key={alert.carId} className={cn('relative', getSeverityColor(alert.severity))}>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {getSeverityIcon(alert.severity)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-semibold">
                  {alert.carModel} ({alert.carPlate})
                </span>
                <Badge className={getSeverityBadgeColor(alert.severity)}>
                  {alert.severity === 'critical' ? 'CRÍTICO' : 
                   alert.severity === 'warning' ? 'AVISO' : 'INFO'}
                </Badge>
              </div>
              
              <AlertDescription className="text-sm">
                {alert.message}
              </AlertDescription>
              
              <div className="mt-2 text-xs opacity-75">
                <span>KM atual: {alert.currentKm.toLocaleString()}</span>
                <span className="mx-2">•</span>
                <span>Próxima manutenção: {alert.nextMaintenanceKm.toLocaleString()}</span>
              </div>
            </div>
            
            {showDismissButton && (
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0 h-6 w-6 p-0 hover:bg-black/10"
                onClick={() => dismissAlert(alert.carId)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </Alert>
      ))}
    </div>
  );
}

// Componente compacto para exibir apenas o contador de alertas
export function MaintenanceAlertsCounter() {
  const { getCriticalAlertsCount, getWarningAlertsCount, loading } = useMaintenanceAlerts();

  if (loading) {
    return null;
  }

  const criticalCount = getCriticalAlertsCount();
  const warningCount = getWarningAlertsCount();
  const totalCount = criticalCount + warningCount;

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-1">
      <Wrench className="h-4 w-4 text-gray-500" />
      {criticalCount > 0 && (
        <Badge className="bg-red-100 text-red-800 text-xs px-1.5 py-0.5">
          {criticalCount}
        </Badge>
      )}
      {warningCount > 0 && (
        <Badge className="bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5">
          {warningCount}
        </Badge>
      )}
    </div>
  );
}