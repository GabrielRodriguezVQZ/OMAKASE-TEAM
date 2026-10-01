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
   - Frontend: http://localhost:5174
   - Backend API: http://localhost:3001
   - Analytics: http://localhost:8001

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

### FASE 0 ✅ Completada
- ✅ Estructura base del monorepo
- ✅ Docker Compose con PostgreSQL
- ✅ NestJS backend con TypeORM
- ✅ Autenticación JWT con roles
- ✅ Seed de usuarios por rol
- ✅ React frontend con login
- ✅ FastAPI analytics básico

### FASE 1 ✅ Completada
- ✅ CRUD de pacientes y cirugías
- ✅ Checklist de 3 momentos
- ✅ Registro de tiempos
- ✅ Envío en tiempo real por WebSocket
- ✅ Pantallas /enfermeria y /quirofano funcionales
- ✅ Eliminación de casos en espera

### FASE 2 ✅ Completada
- ✅ Motor de alertas con 6 reglas automáticas
- ✅ Audit log de solo inserción
- ✅ Línea de tiempo de trazabilidad
- ✅ Bloqueo de avance con pendientes obligatorios
- ✅ Alertas visibles en ambas pantallas
- ✅ Emisión de alertas por WebSocket

### FASE 3 ✅ Completada
- ✅ Panel de gestión con indicadores (cirugías hoy, checklists, alertas, % cumplimiento)
- ✅ Microservicio FastAPI con endpoints de analítica
- ✅ Asistente de voz con Web Speech API (español)
- ✅ Confirmación hablada con speechSynthesis
- ✅ Integración de analítica en panel de gestión

## 🧪 Pruebas

### Probar FASE 0 (Login y Autenticación)

1. Iniciar servicios:
```bash
docker compose up --build
```

2. Esperar a que todos los servicios inicien (aprox. 1-2 minutos)

3. Abrir navegador en http://localhost:5174

4. Iniciar sesión con alguno de los usuarios de prueba:
   - Email: enfermeria@hospital.com
   - Contraseña: password123

5. Verificar redirección a la página correspondiente según el rol

6. Probar logout y volver a login con otros roles

### Probar FASE 1 (Creación de Casos y Envío a Quirófano)

1. Iniciar sesión como enfermería (enfermeria@hospital.com)

2. Crear un nuevo caso:
   - Llenar datos del paciente
   - Llenar datos de la cirugía
   - Agregar equipo quirúrgico
   - Pulsar "Crear Caso"

3. Verificar que el caso aparece en la lista

4. Hacer clic en el caso para ver detalles

5. Pulsar "Enviar a Quirófano"

6. Abrir otra pestaña o dispositivo en http://localhost:5174

7. Iniciar sesión como quirofano (quirofano@hospital.com)

8. Verificar que el caso aparece automáticamente en la pantalla

9. Completar items del checklist

10. Registrar tiempos

11. Verificar que enfermería ve las actualizaciones en tiempo real

### Probar FASE 2 (Alertas y Trazabilidad)

1. Crear un caso sin alergias → Debe generar alerta de advertencia

2. Crear un caso sin sitio quirúrgico → Debe generar alerta de error

3. Enviar a quirófano y verificar que las alertas se sincronizan

4. En quirófano, intentar registrar INICIO_CIRUGIA sin completar checklist ANTES_INCISION → Debe bloquear

5. Resolver alertas pulsando "Resolver"

6. Ver endpoint GET /surgeries/:id/trazabilidad para ver línea de tiempo completa

### Probar FASE 3 (Panel de Gestión y Voz)

1. Iniciar sesión como admin (admin@hospital.com)

2. Ver panel de gestión con indicadores:
   - Cirugías hoy
   - Checklists completos (%)
   - Alertas
   - Tiempo promedio

3. Ver omisiones frecuentes en checklist

4. En quirófano, activar el asistente de voz:
   - Pulsar "Activar Voz"
   - Decir "confirmar identificación"
   - Ver que el sistema pide confirmación
   - Decir "confirmar" o "cancelar"

5. Probar otros comandos de voz

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

Para el funcionamiento del micrófono en la tablet del quirófano (acceso por IP local), se requiere HTTPS. Aquí están las instrucciones para configurar HTTPS local con Caddy:

### Instalación de Caddy

1. Instalar Caddy:
```bash
# Linux (Ubuntu/Debian)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

### Generación de Certificados con mkcert

1. Instalar mkcert:
```bash
# Linux
curl -JLO "https://dl.filippo.io/mkcert/latest?for=Linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert
```

2. Instalar la CA local:
```bash
mkcert -install
```

3. Generar certificados para tu IP local:
```bash
# Obtener tu IP local
ip addr show | grep inet

# Generar certificado (reemplaza 192.168.1.100 con tu IP)
mkcert 192.168.1.100 localhost
```

### Configuración de Caddy

Crear archivo `Caddyfile` en el directorio del proyecto:

```
192.168.1.100 {
    reverse_proxy localhost:5174
    
    # WebSocket
    reverse_proxy localhost:3001 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

### Iniciar Caddy

```bash
# Con certificados generados
caddy run --config Caddyfile
```

### Acceso desde la Tablet

1. Conectar la tablet a la misma red WiFi
2. Abrir el navegador en: `https://192.168.1.100`
3. Verás una advertencia de certificado (porque es autofirmado)
4. Aceptar el certificado y confiar en él
5. El micrófono ahora funcionará correctamente

### Nota Importante

Para el MVP actual, el reconocimiento de voz funciona en `http://localhost:5174` sin necesidad de HTTPS, ya que los navegadores permiten el acceso al micrófono en localhost. HTTPS es necesario solo cuando se accede desde otros dispositivos en la red local.

## 📄 Licencia

Proyecto académico universitario - Datos ficticios.
