import React from 'react';
import { Alert, AlertSeverity, AlertStatus } from '../types';

interface AlertsPanelProps {
  alerts: Alert[];
  onResolve?: (alertId: string) => void;
  userId?: string;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, onResolve, userId }) => {
  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.INFO:
        return 'bg-blue-100 border-blue-500 text-blue-800';
      case AlertSeverity.WARNING:
        return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case AlertSeverity.ERROR:
        return 'bg-red-100 border-red-500 text-red-800';
      case AlertSeverity.CRITICAL:
        return 'bg-red-200 border-red-700 text-red-900';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  const openAlerts = alerts.filter((a) => a.estado === AlertStatus.ABIERTA);

  if (openAlerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <h3 className="text-lg font-semibold mb-3 text-red-600">
        ⚠️ Alertas Activas ({openAlerts.length})
      </h3>
      <div className="space-y-2">
        {openAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-3 border-l-4 rounded ${getSeverityColor(alert.severidad)}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-medium">{alert.mensaje}</p>
                <p className="text-sm opacity-75">
                  {new Date(alert.creada_en).toLocaleString()}
                </p>
              </div>
              {onResolve && userId && (
                <button
                  onClick={() => onResolve(alert.id)}
                  className="ml-2 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Resolver
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertsPanel;
