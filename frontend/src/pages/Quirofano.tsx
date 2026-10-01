import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { connectSocket, disconnectSocket, joinSurgery, leaveSurgery } from '../services/socket';
import { surgeriesApi, alertsApi } from '../services/api';
import { Surgery, SurgeryStatus, ChecklistMoment, SurgeryEvent, CompletionVia, Alert } from '../types';
import AlertsPanel from '../components/AlertsPanel';
import { useVoiceCommands, useSpeechSynthesis } from '../hooks/useVoiceCommands';

interface FlujoResponse {
  surgeryId: string;
  estado: string;
  currentPhase: number;
  events: any[];
  checklistStatus: {
    antesAnestesia: { items: any[]; completado: boolean; pendientes: any[] };
    antesIncision: { items: any[]; completado: boolean; pendientes: any[] };
    antesSalir: { items: any[]; completado: boolean; pendientes: any[] };
  };
}

const Quirofano: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentSurgery, setCurrentSurgery] = useState<Surgery | null>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [flujo, setFlujo] = useState<FlujoResponse | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [justification, setJustification] = useState('');
  const [showJustification, setShowJustification] = useState(false);
  const [cronometro, setCronometro] = useState(0);
  const { speak } = useSpeechSynthesis();

  // Comandos de voz adaptados a fases
  const voiceCommands = [
    {
      command: 'confirmar identificación',
      action: () => handleVoiceChecklist('identificación'),
      validate: () => flujo?.currentPhase === 2 || flujo?.currentPhase === 3,
      invalidMessage: 'Ese comando no aplica en esta fase',
    },
    {
      command: 'confirmar alergias',
      action: () => handleVoiceChecklist('alergias'),
      validate: () => flujo?.currentPhase === 2,
      invalidMessage: 'Ese comando no aplica en esta fase',
    },
    {
      command: 'confirmar sitio quirúrgico',
      action: () => handleVoiceChecklist('sitio quirúrgico'),
      validate: () => flujo?.currentPhase === 2 || flujo?.currentPhase === 3,
      invalidMessage: 'Ese comando no aplica en esta fase',
    },
    {
      command: 'confirmar paciente',
      action: () => handleVoiceChecklist('paciente'),
      validate: () => flujo?.currentPhase === 3,
      invalidMessage: 'Ese comando no aplica en esta fase',
    },
    {
      command: 'confirmar procedimiento',
      action: () => handleVoiceChecklist('procedimiento'),
      validate: () => flujo?.currentPhase === 2 || flujo?.currentPhase === 3,
      invalidMessage: 'Ese comando no aplica en esta fase',
    },
    {
      command: 'confirmar equipo',
      action: () => handleVoiceChecklist('equipo'),
      validate: () => flujo?.currentPhase === 3,
      invalidMessage: 'Ese comando no aplica en esta fase',
    },
    {
      command: 'confirmar antibiótico',
      action: () => handleVoiceChecklist('antibiótico'),
      validate: () => flujo?.currentPhase === 3,
      invalidMessage: 'Ese comando no aplica en esta fase',
    },
    {
      command: 'confirmar riesgos',
      action: () => handleVoiceChecklist('riesgos'),
      validate: () => flujo?.currentPhase === 2 || flujo?.currentPhase === 3,
      invalidMessage: 'Ese comando no aplica en esta fase',
    },
    {
      command: 'siguiente',
      action: () => handleVoiceRegister(),
      validate: () => flujo?.currentPhase >= 1 && flujo?.currentPhase <= 4,
      invalidMessage: 'No hay evento para registrar en esta fase',
    },
    {
      command: 'registrar',
      action: () => handleVoiceRegister(),
      validate: () => flujo?.currentPhase >= 1 && flujo?.currentPhase <= 4,
      invalidMessage: 'No hay evento para registrar en esta fase',
    },
    {
      command: 'repetir',
      action: () => handleVoiceRepeat(),
      validate: () => flujo?.currentPhase >= 2 && flujo?.currentPhase <= 4,
      invalidMessage: 'No hay checklist en esta fase',
    },
    {
      command: 'confirmar',
      action: () => confirmPendingAction(),
    },
    {
      command: 'cancelar',
      action: () => cancelPendingAction(),
    },
  ];

  const { isListening, isSupported, startListening, stopListening, lastCommand, error: voiceError } =
    useVoiceCommands(voiceCommands);

  const loadSurgery = async () => {
    try {
      const surgeryId = localStorage.getItem('currentSurgeryId');
      if (!surgeryId) {
        setCurrentSurgery(null);
        setLoading(false);
        return;
      }

      const surgeryData = await surgeriesApi.getById(surgeryId);
      setCurrentSurgery(surgeryData.data);
      loadFlujo(surgeryId);
      loadAlerts(surgeryId);
    } catch (error) {
      console.error('Error loading surgery:', error);
      setLoading(false);
    }
  };

  const loadFlujo = async (surgeryId: string) => {
    try {
      const flujoData = await surgeriesApi.getFlujo(surgeryId);
      setFlujo(flujoData.data);
    } catch (error) {
      console.error('Error loading flujo:', error);
    }
  };

  const loadAlerts = async (surgeryId: string) => {
    try {
      const alertsData = await alertsApi.getBySurgery(surgeryId);
      setAlerts(alertsData.data);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  useEffect(() => {
    loadSurgery();
    setLoading(false);

    const socket = connectSocket();
    console.log('Socket conectado:', socket);
    
    socket.on('connect', () => {
      console.log('Socket conectado al servidor');
    });
    
    socket.on('disconnect', () => {
      console.log('Socket desconectado del servidor');
    });

    socket.on('surgery:enviada', handleSurgeryEnviada);
    socket.on('checklist:actualizado', handleChecklistActualizado);
    socket.on('tiempo:registrado', handleTiempoRegistrado);
    socket.on('flujo:actualizado', handleFlujoActualizado);
    socket.on('alerta:nueva', handleAlertaNueva);
    socket.on('alerta:resuelta', handleAlertaResuelta);

    return () => {
      disconnectSocket();
    };
  }, []);

  const handleSurgeryEnviada = (data: any) => {
    console.log('Evento surgery:enviada recibido:', data);
    localStorage.setItem('currentSurgeryId', data.surgeryId);
    loadSurgery();
  };

  const handleChecklistActualizado = (data: any) => {
    if (currentSurgery && data.surgeryId === currentSurgery.id) {
      loadSurgery();
    }
  };

  const handleTiempoRegistrado = (data: any) => {
    if (currentSurgery && data.surgeryId === currentSurgery.id) {
      loadSurgery();
    }
  };

  const handleFlujoActualizado = (data: any) => {
    console.log('Flujo actualizado:', data);
    if (currentSurgery && data.surgeryId === currentSurgery.id) {
      setFlujo(data);
      loadSurgery(); // Recargar la cirugía para actualizar estado completo
    }
  };

  const handleAlertaNueva = (data: any) => {
    if (currentSurgery && data.surgeryId === currentSurgery.id) {
      loadAlerts(currentSurgery.id);
    }
  };

  const handleAlertaResuelta = (data: any) => {
    if (currentSurgery && data.surgeryId === currentSurgery.id) {
      loadAlerts(currentSurgery.id);
    }
  };

  const handleChecklistItem = async (itemId: string, completado: boolean) => {
    console.log('=== handleChecklistItem ===');
    console.log('Item ID:', itemId);
    console.log('Completado:', completado);
    console.log('Via:', CompletionVia.MANUAL);
    
    if (!currentSurgery) return;
    try {
      console.log('Enviando petición al backend...');
      await surgeriesApi.updateChecklistItem(currentSurgery.id, itemId, {
        completado,
        completado_por: user?.id,
        completado_en: new Date().toISOString(),
        via: CompletionVia.MANUAL,
      });
      console.log('Petición exitosa');
      setSuccess('Item del checklist actualizado');
      setTimeout(() => setSuccess(null), 3000);
      loadSurgery();
    } catch (error: any) {
      console.error('Error updating checklist:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.message || 'Error al actualizar checklist');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleRegisterTime = async (evento: SurgeryEvent, force = false) => {
    if (!currentSurgery) return;
    
    if (!force) {
      setPendingAction(`¿Registrar ${evento}?`);
      setShowConfirm(true);
      return;
    }

    try {
      await surgeriesApi.registerTime(currentSurgery.id, {
        evento,
        timestamp: new Date().toISOString(),
        registrado_por: user?.id,
        via: CompletionVia.MANUAL,
        justificacion: justification || undefined,
      });

      setSuccess(`Evento "${evento}" registrado exitosamente`);
      setTimeout(() => setSuccess(null), 3000);
      setShowConfirm(false);
      setJustification('');
      setShowJustification(false);
      loadSurgery();
    } catch (error: any) {
      console.error('Error registering time:', error);
      setError(error.response?.data?.message || 'Error al registrar tiempo');
      setTimeout(() => setError(null), 5000);
      setShowConfirm(false);
      setShowJustification(false);
    }
  };

  const handleVoiceChecklist = (itemText: string) => {
    if (!flujo) return;
    
    const phaseChecklist = getPhaseChecklist(flujo.currentPhase);
    // Buscar item que contenga el texto (case insensitive)
    const item = phaseChecklist.find((i) => 
      i.item.toLowerCase().includes(itemText.toLowerCase()) ||
      itemText.toLowerCase().includes(i.item.toLowerCase().split(' ')[0]) // Buscar por primera palabra
    );
    
    if (item) {
      handleChecklistItem(item.id, !item.completado);
    } else {
      speak('Item no encontrado en esta fase');
      console.log('Items disponibles:', phaseChecklist.map(i => i.item));
    }
  };

  const handleVoiceRegister = () => {
    if (!flujo) return;
    
    const phaseEvent = getPhaseEvent(flujo.currentPhase);
    if (phaseEvent) {
      handleRegisterTime(phaseEvent);
    } else {
      speak('No hay evento para registrar en esta fase');
    }
  };

  const handleVoiceRepeat = () => {
    if (!flujo) return;
    
    const phaseChecklist = getPhaseChecklist(flujo.currentPhase);
    const pendientes = phaseChecklist.filter((i) => !i.completado);
    
    if (pendientes.length > 0) {
      const itemsText = pendientes.map((i) => i.item).join(', ');
      speak(`Pendientes: ${itemsText}`);
    } else {
      speak('Todos los items están completos');
    }
  };

  const confirmPendingAction = () => {
    if (pendingAction) {
      const evento = pendingAction.match(/¿Registrar (.+)\?/)?.[1];
      if (evento) {
        handleRegisterTime(evento as SurgeryEvent, true);
      }
    }
  };

  const cancelPendingAction = () => {
    setPendingAction(null);
    setShowConfirm(false);
    setShowJustification(false);
    setJustification('');
    speak('Acción cancelada');
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await alertsApi.resolve(alertId, user?.id || '');
      loadAlerts(currentSurgery?.id || '');
    } catch (error) {
      console.error('Error resolving alert:', error);
      alert('Error al resolver alerta');
    }
  };

  const getPhaseChecklist = (phase: number) => {
    if (!flujo) return [];
    
    switch (phase) {
      case 2:
        return flujo.checklistStatus.antesAnestesia.items;
      case 3:
        return flujo.checklistStatus.antesIncision.items;
      case 4:
        return flujo.checklistStatus.antesSalir.items;
      default:
        return [];
    }
  };

  const getPhaseEvent = (phase: number): SurgeryEvent | null => {
    switch (phase) {
      case 1:
        return SurgeryEvent.INGRESO_PACIENTE;
      case 2:
        return SurgeryEvent.INICIO_ANESTESIA;
      case 3:
        return SurgeryEvent.INICIO_CIRUGIA;
      case 4:
        return SurgeryEvent.FIN_CIRUGIA;
      case 5:
        return SurgeryEvent.SALIDA_RECUPERACION;
      default:
        return null;
    }
  };

  const isPhaseComplete = (phase: number) => {
    if (!flujo) return false;
    
    switch (phase) {
      case 1:
        return flujo.events.some((e) => e.evento === SurgeryEvent.INGRESO_PACIENTE);
      case 2:
        return flujo.checklistStatus.antesAnestesia.completado &&
               flujo.events.some((e) => e.evento === SurgeryEvent.INICIO_ANESTESIA);
      case 3:
        return flujo.checklistStatus.antesIncision.completado &&
               flujo.events.some((e) => e.evento === SurgeryEvent.INICIO_CIRUGIA);
      case 4:
        return flujo.checklistStatus.antesSalir.completado &&
               flujo.events.some((e) => e.evento === SurgeryEvent.FIN_CIRUGIA);
      case 5:
        return flujo.events.some((e) => e.evento === SurgeryEvent.SALIDA_RECUPERACION);
      default:
        return false;
    }
  };

  const canProceedToNext = (phase: number) => {
    if (!flujo) return false;
    
    switch (phase) {
      case 1:
        return true; // Fase 1 no requiere checklist
      case 2:
        return flujo.checklistStatus.antesAnestesia.completado;
      case 3:
        return flujo.checklistStatus.antesIncision.completado;
      case 4:
        return flujo.checklistStatus.antesSalir.completado;
      case 5:
        return true; // Fase 5 es el resumen final
      default:
        return false;
    }
  };

  // Cronómetro para fase 3
  useEffect(() => {
    if (flujo?.currentPhase === 3 && isPhaseComplete(3)) {
      const interval = setInterval(() => {
        setCronometro((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCronometro(0);
    }
  }, [flujo?.currentPhase, flujo?.events]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
            {/* Alertas */}
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded">
                <p className="font-medium text-red-800">{error}</p>
              </div>
            )}
            {success && (
              <div className="bg-green-100 border-l-4 border-green-500 p-4 rounded">
                <p className="font-medium text-green-800">{success}</p>
              </div>
            )}

            {/* Indicador de voz */}
            <div className="bg-white p-4 rounded-lg shadow flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className={`w-4 h-4 rounded-full ${isListening ? 'bg-red-600 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-lg font-medium">
                  {isListening ? 'Escuchando...' : 'Voz inactiva'}
                </span>
                {lastCommand && <span className="text-sm text-gray-600">Último: "{lastCommand}"</span>}
              </div>
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={!isSupported}
                className={`px-6 py-3 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                  isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isListening ? 'Detener Voz' : 'Activar Voz'}
              </button>
              {voiceError && (
                <p className="text-sm text-amber-700">{voiceError}</p>
              )}
            </div>

            {pendingAction && !showJustification && (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded">
                <p className="font-medium text-yellow-800">{pendingAction}</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={confirmPendingAction} className="bg-green-600 text-white px-4 py-2 rounded">
                    Confirmar
                  </button>
                  <button onClick={cancelPendingAction} className="bg-red-600 text-white px-4 py-2 rounded">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {showJustification && (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded">
                <p className="font-medium text-yellow-800">Faltan items obligatorios. Por favor ingrese una justificación:</p>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="w-full mt-2 p-2 border rounded"
                  rows={3}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleRegisterTime(getPhaseEvent(flujo?.currentPhase || 1)!, true)}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                  >
                    Continuar con justificación
                  </button>
                  <button onClick={cancelPendingAction} className="bg-red-600 text-white px-4 py-2 rounded">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <AlertsPanel alerts={alerts} onResolve={handleResolveAlert} userId={user?.id} />

            {/* Barra de progreso */}
            {flujo && (
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                  {[1, 2, 3, 4, 5].map((phase) => {
                    const isCompleted = isPhaseComplete(phase);
                    const isCurrent = flujo.currentPhase === phase;
                    const isBlocked = phase > flujo.currentPhase;
                    
                    return (
                      <div
                        key={phase}
                        className={`flex-1 text-center p-3 rounded ${
                          isCompleted ? 'bg-green-100' : isCurrent ? 'bg-blue-100' : isBlocked ? 'bg-gray-100' : 'bg-white'
                        }`}
                      >
                        <div className="font-semibold">Fase {phase}</div>
                        <div className="text-sm">
                          {isCompleted ? '✓ Completada' : isCurrent ? '→ Actual' : isBlocked ? '🔒 Bloqueada' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contenido de la fase actual */}
            {flujo && (
              <div className="bg-white p-6 rounded-lg shadow">
                {flujo.currentPhase === 1 && <Phase1 surgery={currentSurgery} flujo={flujo} onRegister={handleRegisterTime} />}
                {flujo.currentPhase === 2 && <Phase2 flujo={flujo} onChecklist={handleChecklistItem} onRegister={handleRegisterTime} />}
                {flujo.currentPhase === 3 && <Phase3 flujo={flujo} onChecklist={handleChecklistItem} onRegister={handleRegisterTime} cronometro={cronometro} formatTime={formatTime} />}
                {flujo.currentPhase === 4 && <Phase4 flujo={flujo} onChecklist={handleChecklistItem} onRegister={handleRegisterTime} />}
                {flujo.currentPhase === 5 && <Phase5 flujo={flujo} onRegister={handleRegisterTime} />}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

// Componentes de fase
const Phase1: React.FC<{ surgery: Surgery; flujo: FlujoResponse; onRegister: (e: SurgeryEvent) => void }> = ({ surgery, flujo, onRegister }) => (
  <div>
    <h2 className="text-3xl font-bold mb-6">Fase 1: Ingreso del Paciente</h2>
    <div className="space-y-4 mb-6">
      <div className="p-4 bg-gray-50 rounded">
        <p><strong>Paciente:</strong> {surgery.patient?.nombre}</p>
        <p><strong>Documento:</strong> {surgery.patient?.documento}</p>
        <p><strong>Sitio Quirúrgico:</strong> {surgery.sitio_quirurgico}</p>
        <p><strong>Alergias:</strong> {surgery.patient?.alergias}</p>
        <p><strong>Procedimiento:</strong> {surgery.procedimiento}</p>
      </div>
      <div className="p-4 bg-gray-50 rounded">
        <p className="font-semibold mb-2">Equipo Quirúrgico:</p>
        {surgery.team?.map((member) => (
          <p key={member.id}>{member.rol_quirurgico}: {member.nombre}</p>
        ))}
      </div>
    </div>
    <button
      onClick={() => onRegister(SurgeryEvent.INGRESO_PACIENTE)}
      disabled={isPhaseComplete(1, flujo)}
      className="bg-blue-600 text-white px-8 py-4 rounded text-xl font-semibold disabled:bg-gray-400"
    >
      Registrar Ingreso del Paciente
    </button>
  </div>
);

const Phase2: React.FC<{ flujo: FlujoResponse; onChecklist: (id: string, v: boolean) => void; onRegister: (e: SurgeryEvent) => void }> = ({ flujo, onChecklist, onRegister }) => (
  <div>
    <h2 className="text-3xl font-bold mb-6">Fase 2: Inicio de Anestesia</h2>
    <div className="space-y-2 mb-6">
      {flujo.checklistStatus.antesAnestesia.items.map((item, index) => (
        <div key={index} className="flex items-center gap-4 p-3 border rounded">
          <input
            type="checkbox"
            checked={item.completado}
            onChange={(e) => onChecklist(item.id, e.target.checked)}
            className="w-6 h-6"
            disabled={isPhaseComplete(2, flujo)}
          />
          <span className="text-lg">{item.item}</span>
        </div>
      ))}
    </div>
    <button
      onClick={() => onRegister(SurgeryEvent.INICIO_ANESTESIA)}
      disabled={!flujo.checklistStatus.antesAnestesia.completado || isPhaseComplete(2, flujo)}
      className="bg-yellow-600 text-white px-8 py-4 rounded text-xl font-semibold disabled:bg-gray-400"
    >
      Registrar Inicio de Anestesia
    </button>
    {!flujo.checklistStatus.antesAnestesia.completado && (
      <p className="text-red-600 mt-2">Complete todos los items del checklist antes de continuar</p>
    )}
  </div>
);

const Phase3: React.FC<{ flujo: FlujoResponse; onChecklist: (id: string, v: boolean) => void; onRegister: (e: SurgeryEvent) => void; cronometro: number; formatTime: (s: number) => string }> = ({ flujo, onChecklist, onRegister, cronometro, formatTime }) => (
  <div>
    <h2 className="text-3xl font-bold mb-6">Fase 3: Inicio de Cirugía</h2>
    {isPhaseComplete(3, flujo) && (
      <div className="mb-4 p-4 bg-green-100 rounded text-center">
        <p className="text-2xl font-bold">Duración: {formatTime(cronometro)}</p>
      </div>
    )}
    <div className="space-y-2 mb-6">
      {flujo.checklistStatus.antesIncision.items.map((item, index) => (
        <div key={index} className="flex items-center gap-4 p-3 border rounded">
          <input
            type="checkbox"
            checked={item.completado}
            onChange={(e) => onChecklist(item.id, e.target.checked)}
            className="w-6 h-6"
            disabled={isPhaseComplete(3, flujo)}
          />
          <span className="text-lg">{item.item}</span>
        </div>
      ))}
    </div>
    <button
      onClick={() => onRegister(SurgeryEvent.INICIO_CIRUGIA)}
      disabled={!flujo.checklistStatus.antesIncision.completado || isPhaseComplete(3, flujo)}
      className="bg-green-600 text-white px-8 py-4 rounded text-xl font-semibold disabled:bg-gray-400"
    >
      Registrar Inicio de Cirugía
    </button>
    {!flujo.checklistStatus.antesIncision.completado && (
      <p className="text-red-600 mt-2">Complete todos los items del checklist antes de continuar</p>
    )}
  </div>
);

const Phase4: React.FC<{ flujo: FlujoResponse; onChecklist: (id: string, v: boolean) => void; onRegister: (e: SurgeryEvent) => void }> = ({ flujo, onChecklist, onRegister }) => (
  <div>
    <h2 className="text-3xl font-bold mb-6">Fase 4: Fin de Cirugía</h2>
    <div className="space-y-2 mb-6">
      {flujo.checklistStatus.antesSalir.items.map((item, index) => (
        <div key={index} className="flex items-center gap-4 p-3 border rounded">
          <input
            type="checkbox"
            checked={item.completado}
            onChange={(e) => onChecklist(item.id, e.target.checked)}
            className="w-6 h-6"
            disabled={isPhaseComplete(4, flujo)}
          />
          <span className="text-lg">{item.item}</span>
        </div>
      ))}
    </div>
    <button
      onClick={() => onRegister(SurgeryEvent.FIN_CIRUGIA)}
      disabled={!flujo.checklistStatus.antesSalir.completado || isPhaseComplete(4, flujo)}
      className="bg-red-600 text-white px-8 py-4 rounded text-xl font-semibold disabled:bg-gray-400"
    >
      Registrar Fin de Cirugía
    </button>
    {!flujo.checklistStatus.antesSalir.completado && (
      <p className="text-red-600 mt-2">Complete todos los items del checklist antes de continuar</p>
    )}
  </div>
);

const Phase5: React.FC<{ flujo: FlujoResponse; onRegister: (e: SurgeryEvent) => void }> = ({ flujo, onRegister }) => (
  <div>
    <h2 className="text-3xl font-bold mb-6">Fase 5: Salida a Recuperación</h2>
    <div className="space-y-4 mb-6">
      <div className="p-4 bg-gray-50 rounded">
        <h3 className="font-semibold mb-2">Eventos Registrados:</h3>
        {flujo.events.map((event) => (
          <p key={event.id}>{event.evento}: {new Date(event.timestamp).toLocaleString()}</p>
        ))}
      </div>
      <div className="p-4 bg-gray-50 rounded">
        <h3 className="font-semibold mb-2">Estado del Checklist:</h3>
        <p>Antes de Anestesia: {flujo.checklistStatus.antesAnestesia.completado ? '✓ Completo' : '✗ Incompleto'}</p>
        <p>Antes de Incisión: {flujo.checklistStatus.antesIncision.completado ? '✓ Completo' : '✗ Incompleto'}</p>
        <p>Antes de Salir: {flujo.checklistStatus.antesSalir.completado ? '✓ Completo' : '✗ Incompleto'}</p>
      </div>
    </div>
    <button
      onClick={() => onRegister(SurgeryEvent.SALIDA_RECUPERACION)}
      disabled={isPhaseComplete(5, flujo)}
      className="bg-purple-600 text-white px-8 py-4 rounded text-xl font-semibold disabled:bg-gray-400"
    >
      Registrar Salida a Recuperación
    </button>
  </div>
);

// Función auxiliar
const isPhaseComplete = (phase: number, flujo: FlujoResponse) => {
  switch (phase) {
    case 1:
      return flujo.events.some((e) => e.evento === SurgeryEvent.INGRESO_PACIENTE);
    case 2:
      return flujo.checklistStatus.antesAnestesia.completado &&
             flujo.events.some((e) => e.evento === SurgeryEvent.INICIO_ANESTESIA);
    case 3:
      return flujo.checklistStatus.antesIncision.completado &&
             flujo.events.some((e) => e.evento === SurgeryEvent.INICIO_CIRUGIA);
    case 4:
      return flujo.checklistStatus.antesSalir.completado &&
             flujo.events.some((e) => e.evento === SurgeryEvent.FIN_CIRUGIA);
    case 5:
      return flujo.events.some((e) => e.evento === SurgeryEvent.SALIDA_RECUPERACION);
    default:
      return false;
  }
};

export default Quirofano;
