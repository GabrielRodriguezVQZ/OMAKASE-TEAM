import { DataSource } from 'typeorm';
import { ChecklistItem, ChecklistMoment } from './entities';

export async function migrateChecklistItems(dataSource: DataSource) {
  const checklistRepo = dataSource.getRepository(ChecklistItem);
  const surgeryRepo = dataSource.getRepository('Surgery');

  // Obtener todas las cirugías
  const surgeries = await surgeryRepo.find();
  
  let count = 0;
  
  for (const surgery of surgeries) {
    // Verificar si la cirugía ya tiene items del checklist
    const existingItems = await checklistRepo.count({
      where: { surgery_id: surgery.id }
    });
    
    if (existingItems === 0) {
      // Crear items del checklist por defecto
      const defaultItems = [
        // ANTES_ANESTESIA
        { momento: ChecklistMoment.ANTES_ANESTESIA, item: 'Identificación del paciente confirmada' },
        { momento: ChecklistMoment.ANTES_ANESTESIA, item: 'Procedimiento confirmado' },
        { momento: ChecklistMoment.ANTES_ANESTESIA, item: 'Sitio quirúrgico marcado/confirmado' },
        { momento: ChecklistMoment.ANTES_ANESTESIA, item: 'Alergias validadas' },
        { momento: ChecklistMoment.ANTES_ANESTESIA, item: 'Riesgos identificados' },
        { momento: ChecklistMoment.ANTES_ANESTESIA, item: 'Equipamiento verificado' },
        
        // ANTES_INCISION
        { momento: ChecklistMoment.ANTES_INCISION, item: 'Paciente confirmado' },
        { momento: ChecklistMoment.ANTES_INCISION, item: 'Procedimiento confirmado' },
        { momento: ChecklistMoment.ANTES_INCISION, item: 'Sitio quirúrgico confirmado' },
        { momento: ChecklistMoment.ANTES_INCISION, item: 'Equipo quirúrgico completo' },
        { momento: ChecklistMoment.ANTES_INCISION, item: 'Antibiótico profiláctico administrado' },
        { momento: ChecklistMoment.ANTES_INCISION, item: 'Riesgos previstos revisados' },
        
        // ANTES_SALIR
        { momento: ChecklistMoment.ANTES_SALIR, item: 'Recuento de instrumental completo' },
        { momento: ChecklistMoment.ANTES_SALIR, item: 'Recuento de gasas completo' },
        { momento: ChecklistMoment.ANTES_SALIR, item: 'Muestras identificadas' },
        { momento: ChecklistMoment.ANTES_SALIR, item: 'Novedades registradas' },
        { momento: ChecklistMoment.ANTES_SALIR, item: 'Procedimiento realizado documentado' },
      ];

      for (const item of defaultItems) {
        const checklistItem = checklistRepo.create({
          surgery_id: surgery.id,
          ...item,
          completado: false,
        });
        await checklistRepo.save(checklistItem);
      }
      
      count++;
      console.log(`Checklist items creados para cirugía ${surgery.id} (${surgery.procedimiento})`);
    }
  }
  
  console.log(`Migración completada: ${count} cirugías actualizadas con checklist items`);
}
