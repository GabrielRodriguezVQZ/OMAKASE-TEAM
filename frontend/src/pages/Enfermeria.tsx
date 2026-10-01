import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { connectSocket, disconnectSocket, joinSurgery, leaveSurgery } from '../services/socket';
import { surgeriesApi, patientsApi } from '../services/api';
import { Surgery, Patient, SurgeryStatus, SurgicalRole } from '../types';

const Enfermeria: React.FC = () => {
  const { user, logout } = useAuth();
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [selectedSurgery, setSelectedSurgery] = useState<Surgery | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [patientData, setPatientData] = useState({
    nombre: '',
    documento: '',
    edad: '',
    peso: '',
    talla: '',
    alergias: '',
    info_clinica: '',
    glucometria: '',
    reserva_sangre: '',
  });

  const [surgeryData, setSurgeryData] = useState({
    procedimiento: '',
    sitio_quirurgico: '',
    quirofano: '',
    fecha_programada: '',
  });

  const [teamData, setTeamData] = useState([
    { nombre: '', rol_quirurgico: SurgicalRole.CIRUJANO },
    { nombre: '', rol_quirurgico: SurgicalRole.ANESTESIOLOGO },
    { nombre: '', rol_quirurgico: SurgicalRole.INSTRUMENTADOR },
  ]);

  useEffect(() => {
    loadSurgeries();
    connectSocket(localStorage.getItem('token') || '');

    const socket = (window as any).socket;
    if (socket) {
      socket.on('surgery:enviada', handleSurgeryEnviada);
      socket.on('checklist:actualizado', handleChecklistActualizado);
      socket.on('tiempo:registrado', handleTiempoRegistrado);
      socket.on('surgery:estado', handleSurgeryEstado);
    }

    return () => {
      disconnectSocket();
    };
  }, []);

  const loadSurgeries = async () => {
    try {
      const response = await surgeriesApi.getAll();
      setSurgeries(response.data);
    } catch (error) {
      console.error('Error loading surgeries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSurgeryEnviada = (data: any) => {
    console.log('Cirugía enviada:', data);
    loadSurgeries();
  };

  const handleChecklistActualizado = (data: any) => {
    console.log('Checklist actualizado:', data);
    if (selectedSurgery?.id === data.surgeryId) {
      loadSurgeryDetails(selectedSurgery.id);
    }
  };

  const handleTiempoRegistrado = (data: any) => {
    console.log('Tiempo registrado:', data);
    if (selectedSurgery?.id === data.surgeryId) {
      loadSurgeryDetails(selectedSurgery.id);
    }
  };

  const handleSurgeryEstado = (data: any) => {
    console.log('Estado cambiado:', data);
    loadSurgeries();
    if (selectedSurgery?.id === data.surgeryId) {
      loadSurgeryDetails(selectedSurgery.id);
    }
  };

  const loadSurgeryDetails = async (surgeryId: string) => {
    try {
      const response = await surgeriesApi.getById(surgeryId);
      setSelectedSurgery(response.data);
    } catch (error) {
      console.error('Error loading surgery details:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Crear paciente
      const patientResponse = await patientsApi.create(patientData);
      const patient = patientResponse.data;

      // Crear cirugía
      const surgeryResponse = await surgeriesApi.create({
        patient_id: patient.id,
        procedimiento: surgeryData.procedimiento,
        sitio_quirurgico: surgeryData.sitio_quirurgico,
        quirofano: surgeryData.quirofano,
        fecha_programada: new Date(surgeryData.fecha_programada).toISOString(),
        creada_por: user?.id,
      });

      const surgery = surgeryResponse.data;

      // Agregar equipo
      for (const member of teamData) {
        if (member.nombre) {
          await surgeriesApi.addTeamMember(surgery.id, member);
        }
      }

      setShowNewForm(false);
      loadSurgeries();
      alert('Caso creado exitosamente');
    } catch (error) {
      console.error('Error creating case:', error);
      alert('Error al crear el caso');
    }
  };

  const handleSendToQuirfano = async (surgeryId: string) => {
    try {
      await surgeriesApi.sendToQuirfano(surgeryId);
      alert('Caso enviado a quirófano');
      loadSurgeries();
    } catch (error) {
      console.error('Error sending to quirfano:', error);
      alert('Error al enviar a quirófano');
    }
  };

  const handleDeleteSurgery = async (surgeryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Está seguro de eliminar este caso? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await surgeriesApi.delete(surgeryId);
      alert('Caso eliminado exitosamente');
      loadSurgeries();
    } catch (error: any) {
      console.error('Error deleting surgery:', error);
      alert(error.response?.data?.message || 'Error al eliminar el caso');
    }
  };

  const getStatusColor = (status: SurgeryStatus) => {
    switch (status) {
      case SurgeryStatus.PROGRAMADA:
        return 'bg-gray-200 text-gray-800';
      case SurgeryStatus.PREPARADA:
        return 'bg-blue-200 text-blue-800';
      case SurgeryStatus.EN_QUIROFANO:
        return 'bg-yellow-200 text-yellow-800';
      case SurgeryStatus.EN_CURSO:
        return 'bg-green-200 text-green-800';
      case SurgeryStatus.FINALIZADA:
        return 'bg-purple-200 text-purple-800';
      case SurgeryStatus.EN_RECUPERACION:
        return 'bg-indigo-200 text-indigo-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-8">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Módulo de Enfermería</h1>
          <div className="flex items-center gap-4">
            <span>{user?.nombre}</span>
            <button
              onClick={logout}
              className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-gray-100"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-8">
        {!showNewForm && !selectedSurgery && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Casos Quirúrgicos del Día</h2>
              <button
                onClick={() => setShowNewForm(true)}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
              >
                + Nuevo Caso
              </button>
            </div>

            <div className="grid gap-4">
              {surgeries.map((surgery) => (
                <div
                  key={surgery.id}
                  className="bg-white p-6 rounded-lg shadow hover:shadow-md cursor-pointer"
                  onClick={() => {
                    setSelectedSurgery(surgery);
                    joinSurgery(surgery.id);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{surgery.patient?.nombre}</h3>
                      <p className="text-gray-600">{surgery.procedimiento}</p>
                      <p className="text-sm text-gray-500">
                        Quirofano: {surgery.quirofano} | {new Date(surgery.fecha_programada).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(surgery.estado)}`}>
                        {surgery.estado}
                      </span>
                      {(surgery.estado === SurgeryStatus.PROGRAMADA || surgery.estado === SurgeryStatus.PREPARADA) && (
                        <button
                          onClick={(e) => handleDeleteSurgery(surgery.id, e)}
                          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {showNewForm && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">Nuevo Caso Quirúrgico</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Datos del Paciente</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={patientData.nombre}
                    onChange={(e) => setPatientData({ ...patientData, nombre: e.target.value })}
                    className="border p-2 rounded"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Documento"
                    value={patientData.documento}
                    onChange={(e) => setPatientData({ ...patientData, documento: e.target.value })}
                    className="border p-2 rounded"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Edad"
                    value={patientData.edad}
                    onChange={(e) => setPatientData({ ...patientData, edad: e.target.value })}
                    className="border p-2 rounded"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Peso (kg)"
                    value={patientData.peso}
                    onChange={(e) => setPatientData({ ...patientData, peso: e.target.value })}
                    className="border p-2 rounded"
                  />
                  <input
                    type="number"
                    placeholder="Talla (cm)"
                    value={patientData.talla}
                    onChange={(e) => setPatientData({ ...patientData, talla: e.target.value })}
                    className="border p-2 rounded"
                  />
                  <input
                    type="text"
                    placeholder="Alergias"
                    value={patientData.alergias}
                    onChange={(e) => setPatientData({ ...patientData, alergias: e.target.value })}
                    className="border p-2 rounded"
                  />
                  <textarea
                    placeholder="Info clínica"
                    value={patientData.info_clinica}
                    onChange={(e) => setPatientData({ ...patientData, info_clinica: e.target.value })}
                    className="border p-2 rounded col-span-2"
                    rows={2}
                  />
                  <input
                    type="text"
                    placeholder="Glucometría"
                    value={patientData.glucometria}
                    onChange={(e) => setPatientData({ ...patientData, glucometria: e.target.value })}
                    className="border p-2 rounded"
                  />
                  <input
                    type="text"
                    placeholder="Reserva de sangre"
                    value={patientData.reserva_sangre}
                    onChange={(e) => setPatientData({ ...patientData, reserva_sangre: e.target.value })}
                    className="border p-2 rounded"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Datos de la Cirugía</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Procedimiento"
                    value={surgeryData.procedimiento}
                    onChange={(e) => setSurgeryData({ ...surgeryData, procedimiento: e.target.value })}
                    className="border p-2 rounded"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Sitio quirúrgico"
                    value={surgeryData.sitio_quirurgico}
                    onChange={(e) => setSurgeryData({ ...surgeryData, sitio_quirurgico: e.target.value })}
                    className="border p-2 rounded"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Quirofano"
                    value={surgeryData.quirofano}
                    onChange={(e) => setSurgeryData({ ...surgeryData, quirofano: e.target.value })}
                    className="border p-2 rounded"
                    required
                  />
                  <input
                    type="datetime-local"
                    value={surgeryData.fecha_programada}
                    onChange={(e) => setSurgeryData({ ...surgeryData, fecha_programada: e.target.value })}
                    className="border p-2 rounded"
                    required
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Equipo Quirúrgico</h3>
                <div className="space-y-2">
                  {teamData.map((member, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Nombre ${member.rol_quirurgico}`}
                        value={member.nombre}
                        onChange={(e) => {
                          const newTeam = [...teamData];
                          newTeam[index].nombre = e.target.value;
                          setTeamData(newTeam);
                        }}
                        className="border p-2 rounded flex-1"
                      />
                      <select
                        value={member.rol_quirurgico}
                        onChange={(e) => {
                          const newTeam = [...teamData];
                          newTeam[index].rol_quirurgico = e.target.value as SurgicalRole;
                          setTeamData(newTeam);
                        }}
                        className="border p-2 rounded"
                      >
                        <option value={SurgicalRole.CIRUJANO}>Cirujano</option>
                        <option value={SurgicalRole.ANESTESIOLOGO}>Anestesiólogo</option>
                        <option value={SurgicalRole.INSTRUMENTADOR}>Instrumentador</option>
                        <option value={SurgicalRole.AUXILIAR_ENFERMERIA}>Auxiliar Enfermería</option>
                        <option value={SurgicalRole.OTRO}>Otro</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                >
                  Crear Caso
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {selectedSurgery && (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Detalle del Caso</h2>
              <button
                onClick={() => {
                  setSelectedSurgery(null);
                  leaveSurgery(selectedSurgery.id);
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Volver
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Paciente</h3>
                <p>{selectedSurgery.patient?.nombre}</p>
                <p className="text-sm text-gray-600">Documento: {selectedSurgery.patient?.documento}</p>
                <p className="text-sm text-gray-600">Edad: {selectedSurgery.patient?.edad} años</p>
                {selectedSurgery.patient?.alergias && (
                  <p className="text-sm text-red-600">Alergias: {selectedSurgery.patient.alergias}</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold">Procedimiento</h3>
                <p>{selectedSurgery.procedimiento}</p>
                <p className="text-sm text-gray-600">Sitio: {selectedSurgery.sitio_quirurgico}</p>
                <p className="text-sm text-gray-600">Quirofano: {selectedSurgery.quirofano}</p>
              </div>

              <div>
                <h3 className="font-semibold">Estado</h3>
                <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedSurgery.estado)}`}>
                  {selectedSurgery.estado}
                </span>
              </div>

              {selectedSurgery.estado === SurgeryStatus.PREPARADA && (
                <button
                  onClick={() => handleSendToQuirfano(selectedSurgery.id)}
                  className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 text-lg font-semibold"
                >
                  Enviar a Quirófano
                </button>
              )}

              {selectedSurgery.team && selectedSurgery.team.length > 0 && (
                <div>
                  <h3 className="font-semibold">Equipo Quirúrgico</h3>
                  <ul className="list-disc list-inside">
                    {selectedSurgery.team.map((member) => (
                      <li key={member.id}>
                        {member.nombre} - {member.rol_quirurgico}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Enfermeria;
