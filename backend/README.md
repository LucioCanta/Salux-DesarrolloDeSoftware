# Salux Backend

API REST del sistema de gestión de turnos médicos Salux, construida con Express, Prisma y MySQL.

## Requisitos

- Node.js 18 o superior
- MySQL 8 (local, en Docker, o gestionado en la nube)
- Docker + Docker Compose (opcional, para levantar todo con un comando)

## Configuración

1. Copiá `.env.example` a `.env` y completá los valores reales:

```bash
cp .env.example .env
```

2. Generá secretos fuertes para JWT:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

3. Instalá dependencias (esto también genera el cliente de Prisma vía `postinstall`):

```bash
npm install
```

4. Aplicá las migraciones a la base de datos:

```bash
npm run db:migrate
```

5. (Opcional) Creá el usuario administrador inicial usando las variables `ADMIN_*` del `.env`:

```bash
npm run db:seed
```

## Desarrollo local

```bash
npm run dev
```

El servidor levanta en `http://localhost:3000` (o el puerto definido en `PORT`).

## Con Docker Compose

Levanta la base de datos MySQL y el backend juntos, aplicando migraciones automáticamente:

```bash
docker compose up --build
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión MySQL para Prisma |
| `MYSQL_ROOT_PASSWORD` | Password root de MySQL (usado por docker-compose) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Secretos para firmar tokens JWT |
| `PORT` | Puerto donde escucha el servidor (default `3000`) |
| `NODE_ENV` | `development` o `production` |
| `CORS_ORIGIN` | Origen(es) del frontend permitidos, separados por coma |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NOMBRE`, `ADMIN_DNI` | Usados solo por `crearAdmin.js` |

## Endpoints principales

- `POST /api/auth/register` — Registro de paciente
- `POST /api/auth/login` — Login (devuelve JWT)
- `GET /api/auth/perfil` — Perfil del usuario autenticado
- `GET /api/especialidades` — Listar especialidades
- `POST /api/especialidades` — Crear especialidad (solo admin)
- `GET /api/medicos` — Listar médicos
- `POST /api/medicos` — Registrar médico (solo admin)
- `PATCH /api/pacientes/perfil` — Actualizar perfil del paciente logueado
- `POST /api/turnos` — Reservar turno
- `GET /api/turnos/mis-turnos` — Turnos del paciente logueado
- `GET /api/turnos/agenda-medico` — Agenda del médico logueado
- `PATCH /api/turnos/:id` — Cambiar estado de un turno (paciente dueño, médico dueño o admin)
- `GET /api/health` — Estado del servidor y conexión a la base de datos

## Despliegue en producción

1. Configurá las variables de entorno en la plataforma elegida (Render, Railway, Fly.io, etc.), incluyendo `DATABASE_URL` apuntando a tu MySQL gestionado y `CORS_ORIGIN` con el dominio real del frontend.
2. Comando de build: `npm install` (ejecuta `prisma generate` automáticamente).
3. Antes de arrancar, corré las migraciones: `npm run db:migrate`.
4. Comando de arranque: `npm start`.
5. Asegurate de que `NODE_ENV=production` para que los errores no expongan detalles internos.
