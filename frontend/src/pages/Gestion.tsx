import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi, analyticsApi } from '../services/api';

interface DashboardResumen {
  cirugias_hoy: number;
  cirugias_finalizadas: number;
  cirugias_en_curso: number;
  checklists_completos: number;
  checklists_pendientes: number;
  cumplimiento_porcentaje: number;
  alertas_abiertas: number;
  alertas_resueltas: number;
  alertas_criticas: number;
  tiempo_promedio_minutos: number;
  incidencias: number;
}

interface OmisionFrecuente {
  item: string;
  momento: string;
  omisiones: number;
}

const Gestion: React.FC = () => {
  const { user, logout } = useAuth();
  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [omisiones, setOmisiones] = useState<OmisionFrecuente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    loadOmisiones();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await dashboardApi.getResumen();
      setResumen(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOmisiones = async () => {
    try {
      const response = await analyticsApi.omisionesFrecuentes();
      setOmisiones(response.data.omisiones);
    } catch (error) {
      console.error('Error loading omisiones:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Panel de Gestión</h1>
          <button
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Cerrar Sesión
          </button>
        </div>

        {/* Indicadores principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-medium">Cirugías Hoy</h3>
            <p className="text-4xl font-bold text-blue-600 mt-2">{resumen?.cirugias_hoy || 0}</p>
            <p className="text-sm text-gray-500 mt-1">
              {resumen?.cirugias_finalizadas || 0} finalizadas, {resumen?.cirugias_en_curso || 0} en curso
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-medium">Checklists</h3>
            <p className="text-4xl font-bold text-green-600 mt-2">{resumen?.cumplimiento_porcentaje || 0}%</p>
            <p className="text-sm text-gray-500 mt-1">
              {resumen?.checklists_completos || 0} completos, {resumen?.checklists_pendientes || 0} pendientes
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-medium">Alertas</h3>
            <p className="text-4xl font-bold text-yellow-600 mt-2">{resumen?.alertas_abiertas || 0}</p>
            <p className="text-sm text-gray-500 mt-1">
              {resumen?.alertas_resueltas || 0} resueltas, {resumen?.alertas_criticas || 0} críticas
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-medium">Tiempo Promedio</h3>
            <p className="text-4xl font-bold text-purple-600 mt-2">{resumen?.tiempo_promedio_minutos || 0}m</p>
            <p className="text-sm text-gray-500 mt-1">
              {resumen?.incidencias || 0} incidencias registradas
            </p>
          </div>
        </div>

        {/* Omisiones frecuentes */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Omisiones Frecuentes en Checklist</h2>
          {omisiones.length > 0 ? (
            <div className="space-y-3">
              {omisiones.map((omision, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded">
                  <div>
                    <p className="font-medium text-gray-800">{omision.item}</p>
                    <p className="text-sm text-gray-600">{omision.momento}</p>
                  </div>
                  <span className="text-red-600 font-bold">{omision.omisiones} omisiones</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No hay datos de omisiones</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Gestion;
