import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { seed } from './database/seed';
import { seedHistoricalData } from './database/seed-historical';
import { migrateChecklistItems } from './database/migrate-checklist';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5174',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Surgical Safety Dashboard API')
    .setDescription('API para el Tablero Inteligente de Seguridad Quirúrgica')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const dataSource = app.get(DataSource);
  await seed(dataSource);
  
  // Seed de datos históricos (solo si no existen cirugías anteriores)
  const surgeryRepo = dataSource.getRepository('Surgery');
  const existingSurgeries = await surgeryRepo.count();
  if (existingSurgeries <= 3) { // Solo si hay pocos datos (los del seed básico)
    console.log('Generando datos históricos...');
    await seedHistoricalData(dataSource);
  }
  
  // Migración de checklist items para cirugías que no tienen
  console.log('Verificando migración de checklist items...');
  await migrateChecklistItems(dataSource);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
