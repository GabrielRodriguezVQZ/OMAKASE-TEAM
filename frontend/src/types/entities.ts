export enum SurgeryStatus {
  PROGRAMADA = 'PROGRAMADA',
  PREPARADA = 'PREPARADA',
  EN_QUIROFANO = 'EN_QUIROFANO',
  EN_CURSO = 'EN_CURSO',
  FINALIZADA = 'FINALIZADA',
  EN_RECUPERACION = 'EN_RECUPERACION',
}

export enum SurgicalRole {
  CIRUJANO = 'CIRUJANO',
  ANESTESIOLOGO = 'ANESTESIOLOGO',
  INSTRUMENTADOR = 'INSTRUMENTADOR',
  AUXILIAR_ENFERMERIA = 'AUXILIAR_ENFERMERIA',
  OTRO = 'OTRO',
}

export enum ChecklistMoment {
  ANTES_ANESTESIA = 'ANTES_ANESTESIA',
  ANTES_INCISION = 'ANTES_INCISION',
  ANTES_SALIR = 'ANTES_SALIR',
}

export enum CompletionVia {
  MANUAL = 'MANUAL',
  VOZ = 'VOZ',
}

export enum SurgeryEvent {
  INGRESO_PACIENTE = 'INGRESO_PACIENTE',
  INICIO_ANESTESIA = 'INICIO_ANESTESIA',
  INICIO_CIRUGIA = 'INICIO_CIRUGIA',
  FIN_CIRUGIA = 'FIN_CIRUGIA',
  SALIDA_RECUPERACION = 'SALIDA_RECUPERACION',
}

export interface Patient {
  id: string;
  nombre: string;
  documento: string;
  edad: number;
  peso?: number;
  talla?: number;
  alergias?: string;
  info_clinica?: string;
  glucometria?: string;
  reserva_sangre?: string;
  creado_en: string;
}

export interface Surgery {
  id: string;
  patient_id: string;
  patient?: Patient;
  procedimiento: string;
  sitio_quirurgico: string;
  quirofano: string;
  estado: SurgeryStatus;
  fecha_programada: string;
  creada_por: string;
  creador?: any;
  creado_en: string;
  team?: SurgeryTeamMember[];
  checklist?: ChecklistItem[];
  times?: SurgeryTime[];
}

export interface SurgeryTeamMember {
  id: string;
  surgery_id: string;
  nombre: string;
  rol_quirurgico: SurgicalRole;
  verificado_por?: string;
  verificado_en?: string;
  creado_en: string;
}

export interface ChecklistItem {
  id: string;
  surgery_id: string;
  momento: ChecklistMoment;
  item: string;
  completado: boolean;
  completado_por?: string;
  completado_en?: string;
  via?: CompletionVia;
  creado_en: string;
}

export interface SurgeryTime {
  id: string;
  surgery_id: string;
  evento: SurgeryEvent;
  timestamp: string;
  registrado_por: string;
  via: CompletionVia;
  creado_en: string;
}
