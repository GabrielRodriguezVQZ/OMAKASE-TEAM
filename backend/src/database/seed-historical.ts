import { DataSource } from 'typeorm';
import { Patient, Surgery, SurgeryTeam, ChecklistItem, SurgeryTime, Alert, User, AuditLog } from './entities';
import { SurgeryStatus, ChecklistMoment, SurgeryEvent, AlertSeverity, AlertStatus, SurgicalRole, CompletionVia } from './entities';

export async function seedHistoricalData(dataSource: DataSource) {
  const patientRepo = dataSource.getRepository(Patient);
  const surgeryRepo = dataSource.getRepository(Surgery);
  const surgeryTeamRepo = dataSource.getRepository(SurgeryTeam);
  const checklistRepo = dataSource.getRepository(ChecklistItem);
  const surgeryTimeRepo = dataSource.getRepository(SurgeryTime);
  const alertRepo = dataSource.getRepository(Alert);
  const auditLogRepo = dataSource.getRepository(AuditLog);
  const userRepo = dataSource.getRepository(User);

  // Obtener usuarios existentes
  const users = await userRepo.find();
  const enfermeriaUser = users.find(u => u.rol === 'ENFERMERIA');
  const quirofanoUser = users.find(u => u.rol === 'QUIROFANO');

  if (!enfermeriaUser || !quirofanoUser) {
    console.log('No se encontraron usuarios necesarios para seed histórico');
    return;
  }

  // Procedimientos ficticios
  const procedimientos = [
    'Apendicectomía',
    'Cesárea',
    'Colecistectomía',
    'Herniorrafia',
    'Artroscopia de rodilla',
    'Mastectomía',
    'Prostatectomía',
    'Histerectomía',
    'Catarata',
    'Amigdalectomía',
  ];

  // Nombres ficticios
  const nombres = [
    'Juan Pérez', 'María García', 'Carlos López', 'Ana Martínez', 'Pedro Rodríguez',
    'Laura Sánchez', 'Miguel Fernández', 'Carmen González', 'José Díaz', 'Isabel Ruiz',
    'Francisco Torres', 'Lucía Morales', 'Antonio Jiménez', 'Sofía Navarro', 'Diego Rivas',
    'Elena Castro', 'Rafael Ortega', 'Patricia Mendoza', 'Javier Herrera', 'Adela Flores',
  ];

  // Generar 50 cirugías históricas de los últimos 30 días
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);

  for (let i = 0; i < 50; i++) {
    // Fecha aleatoria en los últimos 30 días
    const surgeryDate = new Date(startDate.getTime() + Math.random() * (today.getTime() - startDate.getTime()));
    surgeryDate.setHours(8 + Math.floor(Math.random() * 8), 0, 0, 0); // Entre 8 AM y 4 PM

    // Crear paciente
    const patient = patientRepo.create({
      nombre: nombres[Math.floor(Math.random() * nombres.length)],
      documento: (1000000000 + Math.floor(Math.random() * 9000000000)).toString(),
      edad: 20 + Math.floor(Math.random() * 60),
      peso: 50 + Math.floor(Math.random() * 80),
      talla: 150 + Math.floor(Math.random() * 40),
      alergias: Math.random() > 0.7 ? 'Ninguna' : 'Penicilina',
      info_clinica: 'Datos ficticios para pruebas',
      glucometria: (80 + Math.floor(Math.random() * 40)).toString(),
      reserva_sangre: Math.random() > 0.5 ? 'no' : 'si',
    });
    const savedPatient = await patientRepo.save(patient) as Patient;

    // Crear cirugía
    const procedimiento = procedimientos[Math.floor(Math.random() * procedimientos.length)];
    const surgery = surgeryRepo.create({
      patient_id: savedPatient.id,
      procedimiento,
      sitio_quirurgico: ['Abdomen', 'Pelvis', 'Rodilla', 'Mama', 'Próstata', 'Útero', 'Ojo', 'Garganta'][Math.floor(Math.random() * 8)],
      quirofano: `Quirofano ${1 + Math.floor(Math.random() * 5)}`,
      estado: SurgeryStatus.FINALIZADA,
      fecha_programada: surgeryDate,
      creada_por: enfermeriaUser.id,
    });
    const savedSurgery = await surgeryRepo.save(surgery);

    // Crear equipo quirúrgico
    const roles = [SurgicalRole.CIRUJANO, SurgicalRole.ANESTESIOLOGO, SurgicalRole.INSTRUMENTADOR, SurgicalRole.AUXILIAR_ENFERMERIA];
    for (const rol of roles) {
      const teamMember = surgeryTeamRepo.create({
        surgery_id: savedSurgery.id,
        nombre: nombres[Math.floor(Math.random() * nombres.length)],
        rol_quirurgico: rol,
        verificado_por: quirofanoUser.id,
        verificado_en: new Date(surgeryDate.getTime() + 15 * 60000),
      });
      await surgeryTeamRepo.save(teamMember);
    }

    // Crear checklist items (algunos completados, otros no)
    const checklistItems = [
      { momento: ChecklistMoment.ANTES_ANESTESIA, item: 'Identificación del paciente' },
      { momento: ChecklistMoment.ANTES_ANESTESIA, item: 'Procedimiento confirmado' },
      { momento: ChecklistMoment.ANTES_ANESTESIA, item: 'Sitio quirúrgico marcado' },
      { momento: ChecklistMoment.ANTES_ANESTESIA, item: 'Alergias validadas' },
      { momento: ChecklistMoment.ANTES_ANESTESIA, item: 'Riesgos anestésicos' },
      { momento: ChecklistMoment.ANTES_ANESTESIA, item: 'Equipamiento verificado' },
      { momento: ChecklistMoment.ANTES_INCISION, item: 'Paciente en quirófano' },
      { momento: ChecklistMoment.ANTES_INCISION, item: 'Procedimiento' },
      { momento: ChecklistMoment.ANTES_INCISION, item: 'Sitio quirúrgico' },
      { momento: ChecklistMoment.ANTES_INCISION, item: 'Equipo quirúrgico presente' },
      { momento: ChecklistMoment.ANTES_INCISION, item: 'Antibiótico profiláctico' },
      { momento: ChecklistMoment.ANTES_INCISION, item: 'Riesgos previstos' },
      { momento: ChecklistMoment.ANTES_SALIR, item: 'Recuento instrumental' },
      { momento: ChecklistMoment.ANTES_SALIR, item: 'Recuento de gasas' },
      { momento: ChecklistMoment.ANTES_SALIR, item: 'Muestras identificadas' },
      { momento: ChecklistMoment.ANTES_SALIR, item: 'Novedades registradas' },
      { momento: ChecklistMoment.ANTES_SALIR, item: 'Procedimiento realizado' },
    ];

    for (const item of checklistItems) {
      const completado = Math.random() > 0.2; // 80% completados
      const checklistItem = checklistRepo.create({
        surgery_id: savedSurgery.id,
        momento: item.momento,
        item: item.item,
        completado,
        completado_por: completado ? quirofanoUser.id : null,
        completado_en: completado ? new Date(surgeryDate.getTime() + 30 * 60000) : null,
        via: completado ? CompletionVia.MANUAL : undefined,
      });
      await checklistRepo.save(checklistItem);
    }

    // Crear tiempos de cirugía
    const baseTime = surgeryDate.getTime();
    const eventos = [
      { evento: SurgeryEvent.INGRESO_PACIENTE, offset: 0 },
      { evento: SurgeryEvent.INICIO_ANESTESIA, offset: 15 },
      { evento: SurgeryEvent.INICIO_CIRUGIA, offset: 45 },
      { evento: SurgeryEvent.FIN_CIRUGIA, offset: 45 + (30 + Math.random() * 90) }, // 30-120 minutos de cirugía
      { evento: SurgeryEvent.SALIDA_RECUPERACION, offset: 45 + (30 + Math.random() * 90) + 15 },
    ];

    for (const evento of eventos) {
      const surgeryTime = surgeryTimeRepo.create({
        surgery_id: savedSurgery.id,
        evento: evento.evento,
        timestamp: new Date(baseTime + evento.offset * 60000),
        registrado_por: quirofanoUser.id,
        via: CompletionVia.MANUAL,
      });
      await surgeryTimeRepo.save(surgeryTime);
    }

    // Crear algunas alertas (20% de las cirugías tienen alertas)
    if (Math.random() > 0.8) {
      const alertTypes = [
        { tipo: 'ALERGIAS_SIN_VALIDAR', mensaje: 'Alergias no validadas', severidad: AlertSeverity.WARNING },
        { tipo: 'ANTIBIOTICO_NO_REGISTRADO', mensaje: 'Antibiótico no registrado', severidad: AlertSeverity.CRITICAL },
        { tipo: 'RECUENTO_PENDIENTE', mensaje: 'Recuento de material pendiente', severidad: AlertSeverity.CRITICAL },
      ];
      const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const alert = alertRepo.create({
        surgery_id: savedSurgery.id,
        tipo: alertType.tipo,
        mensaje: alertType.mensaje,
        severidad: alertType.severidad,
        estado: Math.random() > 0.5 ? AlertStatus.RESUELTA : AlertStatus.ABIERTA,
        resuelta_por: Math.random() > 0.5 ? enfermeriaUser.id : null,
        resuelta_en: Math.random() > 0.5 ? new Date(baseTime + 120 * 60000) : null,
      });
      await alertRepo.save(alert);
    }

    // Crear audit logs
    const auditLog = auditLogRepo.create({
      surgery_id: savedSurgery.id,
      usuario_id: enfermeriaUser.id,
      accion: 'CREAR_CIRUGIA',
      detalle: { procedimiento, seed: 'historical' },
    });
    await auditLogRepo.save(auditLog);

    console.log(`Cirugía ${i + 1}/50 creada: ${procedimiento} - ${savedPatient.nombre}`);
  }

  console.log('Seed de datos históricos completado: 50 cirugías creadas');
}
