# Tablero Inteligente de Seguridad Quirúrgica

Sistema digital para la verificación de seguridad quirúrgica y trazabilidad de procedimientos.

## 🏗️ Arquitectura

Monorepo con tres servicios principales:

- **Frontend**: React + TypeScript (Vite) con Tailwind CSS
- **Backend**: NestJS + TypeScript con TypeORM
- **Analytics**: FastAPI (Python) para análisis de datos
- **Base de datos**: PostgreSQL

## 🚀 Inicio Rápido

### Requisitos previos

- Docker y Docker Compose instalados
- Git

### Pasos para iniciar

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd OMAKASE-TEAM
```

2. Copiar archivo de entorno:
```bash
cp .env.example .env
```

3. Iniciar todos los servicios:
```bash
docker compose up --build
```

4. Acceder a la aplicación:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Analytics: http://localhost:8000

## 👥 Usuarios de Prueba

El sistema se inicializa con tres usuarios de prueba (contraseña: `password123`):

| Rol | Email | Acceso |
|-----|-------|--------|
| Enfermería | enfermeria@hospital.com | /enfermeria |
| Quirofano | quirofano@hospital.com | /quirofano |
| Admin | admin@hospital.com | /gestion |

## 📁 Estructura del Proyecto

```
surgical-safety-dashboard/
├── frontend/          # React + TypeScript
│   ├── src/
│   │   ├── components/
│   │   ├── pages/     # Login, Enfermeria, Quirofano, Gestion
│   │   ├── hooks/
│   │   ├── services/  # API client, WebSocket
│   │   └── contexts/  # Auth context
├── backend/           # NestJS + TypeScript
│   ├── src/
│   │   ├── auth/      # JWT, roles, guards
│   │   ├── patients/
│   │   ├── surgeries/
│   │   ├── alerts/
│   │   ├── audit/
│   │   ├── dashboard/
│   │   └── websocket/ # Socket.IO Gateway
├── analytics/         # FastAPI (Python)
│   └── app/
├── docker-compose.yml
└── README.md
```

## 🔐 Seguridad y Datos

**IMPORTANTE**: Este proyecto utiliza datos 100% ficticios para fines académicos. En un entorno de producción con datos reales de pacientes, se debe cumplir con la Ley 1581 de 2012 de Colombia (Protección de Datos Personales) y regulaciones de salud correspondientes.

## 📋 Fases de Desarrollo

### FASE 0 (Actual)
- ✅ Estructura base del monorepo
- ✅ Docker Compose con PostgreSQL
- ✅ NestJS backend con TypeORM
- ✅ Autenticación JWT con roles
- ✅ Seed de usuarios por rol
- ✅ React frontend con login
- ✅ FastAPI analytics básico

### FASE 1 (Pendiente)
- CRUD de pacientes y cirugías
- Checklist de 3 momentos
- Registro de tiempos
- Envío en tiempo real por WebSocket

### FASE 2 (Pendiente)
- Motor de alertas
- Audit log de solo inserción
- Línea de tiempo de trazabilidad
- Bloqueo de avance con pendientes

### FASE 3 (Pendiente)
- Panel de gestión con indicadores
- Asistente de voz con Vosk
- HTTPS local para micrófono
- Integración con analytics

## 🧪 Pruebas

### Probar FASE 0

1. Iniciar servicios:
```bash
docker compose up --build
```

2. Esperar a que todos los servicios inicien (aprox. 1-2 minutos)

3. Abrir navegador en http://localhost:5173

4. Iniciar sesión con alguno de los usuarios de prueba:
   - Email: enfermeria@hospital.com
   - Contraseña: password123

5. Verificar redirección a la página correspondiente según el rol

6. Probar logout y volver a login con otros roles

## 🔧 Comandos Útiles

### Backend
```bash
cd backend
npm install
npm run start:dev
npm run seed
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Analytics
```bash
cd analytics
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 📝 Notas sobre HTTPS para Micrófono

Para el funcionamiento del micrófono en la tablet del quirófano (acceso por IP local), se requiere HTTPS. En fases posteriores se configurará Caddy con certificados autofirmados.

Instrucciones futuras:
1. Instalar mkcert en el host
2. Generar certificados
3. Configurar Caddy como reverse proxy
4. Confiar en el certificado en la tablet

## 📄 Licencia

Proyecto académico universitario - Datos ficticios.
