import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, X, Car, Info, AlertTriangle } from 'lucide-react';
import { useIdleCarAlerts } from '@/hooks/useIdleCarAlerts';
import { cn } from '@/lib/utils';
import { formatDateObjectForDisplay } from '@/utils/dateUtils';

interface IdleCarAlertsProps {
  className?: string;
  showDismissButton?: boolean;
}

export function IdleCarAlerts({ className, showDismissButton = true }: IdleCarAlertsProps) {
  const { 
    alerts, 
    loading, 
    dismissAlert, 
    getCriticalAlertsCount, 
    getWarningAlertsCount,
    getInfoAlertsCount 
  } = useIdleCarAlerts();

  if (loading) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 animate-spin" />
          <span className="text-sm text-gray-500">Verificando carros parados...</span>
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center space-x-2 text-green-600">
          <Car className="h-4 w-4" />
          <span className="text-sm">Todos os carros estão com uso regular</span>
        </div>
      </div>
    );
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <Clock className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getSeverityTextColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Resumo dos alertas */}
      {(getCriticalAlertsCount() > 0 || getWarningAlertsCount() > 0) && (
        <div className="flex items-center space-x-2 mb-3">
          <Clock className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            Alertas de Carros Parados:
          </span>
          {getCriticalAlertsCount() > 0 && (
            <Badge variant="destructive" className="text-xs">
              {getCriticalAlertsCount()} crítico{getCriticalAlertsCount() > 1 ? 's' : ''}
            </Badge>
          )}
          {getWarningAlertsCount() > 0 && (
            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
              {getWarningAlertsCount()} aviso{getWarningAlertsCount() > 1 ? 's' : ''}
            </Badge>
          )}
          {getInfoAlertsCount() > 0 && (
            <Badge variant="outline" className="text-xs">
              {getInfoAlertsCount()} info{getInfoAlertsCount() > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      )}

      {/* Lista de alertas */}
      {alerts.map((alert) => (
        <Alert 
          key={alert.carId} 
          className={cn(
            'relative',
            getSeverityColor(alert.severity)
          )}
        >
          <div className="flex items-start space-x-3">
            <div className={cn('mt-0.5', getSeverityTextColor(alert.severity))}>
              {getSeverityIcon(alert.severity)}
            </div>
            
            <div className="flex-1 min-w-0">
              <AlertDescription className={cn('text-sm', getSeverityTextColor(alert.severity))}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">
                      {alert.carModel} ({alert.carPlate})
                    </span>
                    <div className="mt-1">
                      {alert.message}
                    </div>
                    {alert.lastUsedDate && (
                      <div className="text-xs mt-1 opacity-75">
                        Último uso: {formatDateObjectForDisplay(new Date(alert.lastUsedDate))}
                      </div>
                    )}
                  </div>
                  
                  {showDismissButton && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissAlert(alert.carId)}
                      className="h-6 w-6 p-0 hover:bg-white/50"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
}

// Componente compacto para exibir apenas o contador de alertas
export function IdleCarAlertsCounter() {
  const { getCriticalAlertsCount, getWarningAlertsCount, loading } = useIdleCarAlerts();

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
      <Clock className="h-4 w-4 text-orange-600" />
      <span className="text-sm font-medium text-gray-700">
        {totalCount} carro{totalCount > 1 ? 's' : ''} parado{totalCount > 1 ? 's' : ''}
      </span>
      {criticalCount > 0 && (
        <Badge variant="destructive" className="text-xs">
          {criticalCount}
        </Badge>
      )}
      {warningCount > 0 && (
        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
          {warningCount}
        </Badge>
      )}
    </div>
  );
}