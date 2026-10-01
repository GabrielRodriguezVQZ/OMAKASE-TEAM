import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { connectSocket, disconnectSocket, joinSurgery, leaveSurgery } from '../services/socket';
import { surgeriesApi } from '../services/api';
import { Surgery, SurgeryStatus, ChecklistMoment, SurgeryEvent, CompletionVia } from '../types';

const Quirofano: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentSurgery, setCurrentSurgery] = useState<Surgery | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    connectSocket(localStorage.getItem('token') || '');

    const socket = (window as any).socket;
    if (socket) {
      socket.on('surgery:enviada', handleSurgeryEnviada);
      socket.on('checklist:actualizado', handleChecklistActualizado);
      socket.on('tiempo:registrado', handleTiempoRegistrado);
      socket.on('surgery:estado', handleSurgeryEstado);
    }

    // Buscar cirugía en quirófano
    loadCurrentSurgery();

    return () => {
      disconnectSocket();
    };
  }, []);

  const loadCurrentSurgery = async () => {
    try {
      const response = await surgeriesApi.getAll();
      const surgeryInQuirfano = response.data.find(
        (s: Surgery) => s.estado === SurgeryStatus.EN_QUIROFANO || s.estado === SurgeryStatus.EN_CURSO
      );
      if (surgeryInQuirfano) {
        setCurrentSurgery(surgeryInQuirfano);
        joinSurgery(surgeryInQuirfano.id);
      }
    } catch (error) {
      console.error('Error loading current surgery:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSurgeryEnviada = async (data: any) => {
    console.log('Cirugía recibida:', data);
    const surgery = data.surgery;
    setCurrentSurgery(surgery);
    joinSurgery(surgery.id);
  };

  const handleChecklistActualizado = (data: any) => {
    console.log('Checklist actualizado:', data);
    if (currentSurgery?.id === data.surgeryId) {
      loadSurgeryDetails();
    }
  };

  const handleTiempoRegistrado = (data: any) => {
    console.log('Tiempo registrado:', data);
    if (currentSurgery?.id === data.surgeryId) {
      loadSurgeryDetails();
    }
  };

  const handleSurgeryEstado = (data: any) => {
    console.log('Estado cambiado:', data);
    if (currentSurgery?.id === data.surgeryId) {
      loadSurgeryDetails();
    }
  };

  const loadSurgeryDetails = async () => {
    if (!currentSurgery) return;
    try {
      const response = await surgeriesApi.getById(currentSurgery.id);
      setCurrentSurgery(response.data);
    } catch (error) {
      console.error('Error loading surgery details:', error);
    }
  };

  const handleChecklistItem = async (itemId: string, completado: boolean) => {
    if (!currentSurgery) return;
    try {
      await surgeriesApi.updateChecklistItem(currentSurgery.id, itemId, {
        completado,
        completado_por: user?.id,
        completado_en: new Date().toISOString(),
        via: CompletionVia.MANUAL,
      });
    } catch (error) {
      console.error('Error updating checklist:', error);
    }
  };

  const handleRegisterTime = async (evento: SurgeryEvent) => {
    if (!currentSurgery) return;
    try {
      await surgeriesApi.registerTime(currentSurgery.id, {
        evento,
        timestamp: new Date().toISOString(),
        registrado_por: user?.id,
        via: CompletionVia.MANUAL,
      });

      // Actualizar estado según el evento
      let newStatus = currentSurgery.estado;
      if (evento === SurgeryEvent.INICIO_CIRUGIA) {
        newStatus = SurgeryStatus.EN_CURSO;
      } else if (evento === SurgeryEvent.FIN_CIRUGIA) {
        newStatus = SurgeryStatus.FINALIZADA;
      } else if (evento === SurgeryEvent.SALIDA_RECUPERACION) {
        newStatus = SurgeryStatus.EN_RECUPERACION;
      }

      if (newStatus !== currentSurgery.estado) {
        await surgeriesApi.update(currentSurgery.id, { estado: newStatus });
      }
    } catch (error) {
      console.error('Error registering time:', error);
    }
  };

  const getChecklistByMoment = (momento: ChecklistMoment) => {
    if (!currentSurgery?.checklist) return [];
    return currentSurgery.checklist.filter((item) => item.momento === momento);
  };

  const getMomentLabel = (momento: ChecklistMoment) => {
    switch (momento) {
      case ChecklistMoment.ANTES_ANESTESIA:
        return 'Antes de la Anestesia';
      case ChecklistMoment.ANTES_INCISION:
        return 'Antes de la Incisión';
      case ChecklistMoment.ANTES_SALIR:
        return 'Antes de Salir';
      default:
        return momento;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-4xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-green-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Módulo de Quirofano</h1>
          <div className="flex items-center gap-4">
            <span className="text-xl">{user?.nombre}</span>
            <button
              onClick={logout}
              className="bg-white text-green-600 px-4 py-2 rounded hover:bg-gray-100 text-lg"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-8">
        {!currentSurgery ? (
          <div className="bg-white p-12 rounded-lg shadow text-center">
            <h2 className="text-4xl font-bold mb-4">Esperando Caso...</h2>
            <p className="text-2xl text-gray-600">No hay cirugías en quirófano actualmente</p>
            <p className="text-xl text-gray-500 mt-4">El sistema notificará cuando se envíe un caso</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Información del paciente */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-3xl font-bold mb-4">Paciente: {currentSurgery.patient?.nombre}</h2>
              <div className="grid grid-cols-2 gap-4 text-xl">
                <div>
                  <span className="font-semibold">Procedimiento:</span> {currentSurgery.procedimiento}
                </div>
                <div>
                  <span className="font-semibold">Sitio Quirúrgico:</span> {currentSurgery.sitio_quirurgico}
                </div>
                <div>
                  <span className="font-semibold">Quirofano:</span> {currentSurgery.quirofano}
                </div>
                <div>
                  <span className="font-semibold">Estado:</span> {currentSurgery.estado}
                </div>
                {currentSurgery.patient?.alergias && (
                  <div className="col-span-2 text-red-600 font-semibold">
                    ⚠️ Alergias: {currentSurgery.patient.alergias}
                  </div>
                )}
              </div>
            </div>

            {/* Registro de tiempos */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-2xl font-bold mb-4">Registro de Tiempos</h3>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => handleRegisterTime(SurgeryEvent.INGRESO_PACIENTE)}
                  className="bg-blue-600 text-white p-4 rounded hover:bg-blue-700 text-xl font-semibold"
                >
                  Ingreso Paciente
                </button>
                <button
                  onClick={() => handleRegisterTime(SurgeryEvent.INICIO_ANESTESIA)}
                  className="bg-yellow-600 text-white p-4 rounded hover:bg-yellow-700 text-xl font-semibold"
                >
                  Inicio Anestesia
                </button>
                <button
                  onClick={() => handleRegisterTime(SurgeryEvent.INICIO_CIRUGIA)}
                  className="bg-green-600 text-white p-4 rounded hover:bg-green-700 text-xl font-semibold"
                >
                  Inicio Cirugía
                </button>
                <button
                  onClick={() => handleRegisterTime(SurgeryEvent.FIN_CIRUGIA)}
                  className="bg-red-600 text-white p-4 rounded hover:bg-red-700 text-xl font-semibold"
                >
                  Fin Cirugía
                </button>
                <button
                  onClick={() => handleRegisterTime(SurgeryEvent.SALIDA_RECUPERACION)}
                  className="bg-purple-600 text-white p-4 rounded hover:bg-purple-700 text-xl font-semibold"
                >
                  Salida Recuperación
                </button>
              </div>

              {currentSurgery.times && currentSurgery.times.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xl font-semibold mb-2">Tiempos Registrados:</h4>
                  <ul className="list-disc list-inside">
                    {currentSurgery.times.map((time) => (
                      <li key={time.id} className="text-lg">
                        {time.evento} - {new Date(time.timestamp).toLocaleString()} ({time.via})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Checklist */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-2xl font-bold mb-4">Checklist de Seguridad</h3>
              {[ChecklistMoment.ANTES_ANESTESIA, ChecklistMoment.ANTES_INCISION, ChecklistMoment.ANTES_SALIR].map(
                (momento) => {
                  const items = getChecklistByMoment(momento);
                  if (items.length === 0) return null;
                  return (
                    <div key={momento} className="mb-6">
                      <h4 className="text-xl font-semibold mb-3">{getMomentLabel(momento)}</h4>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-4 p-3 border rounded hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={item.completado}
                              onChange={(e) => handleChecklistItem(item.id, e.target.checked)}
                              className="w-6 h-6"
                            />
                            <span className={`text-lg ${item.completado ? 'line-through text-gray-500' : ''}`}>
                              {item.item}
                            </span>
                            {item.completado && (
                              <span className="text-sm text-gray-500">
                                ({item.via} - {new Date(item.completado_en || '').toLocaleTimeString()})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Quirofano;
