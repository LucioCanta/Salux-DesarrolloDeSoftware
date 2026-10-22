# Salux

Sistema de gestión de turnos médicos para una clínica universitaria.

| Parte | Tecnología | Carpeta |
|---|---|---|
| Frontend | React + Vite + Tailwind | `src/` |
| API | Node.js + Express + Prisma | `backend/` ([README](backend/README.md)) |
| Base de datos | PostgreSQL | local en Docker · producción en Supabase |
| Hosting | Vercel (frontend y API en un mismo proyecto) | `api/`, `vercel.json` |

## Desarrollo local

```bash
# 1. Backend + base de datos + Redis (Docker). Copiá backend/.env.example a backend/.env y completalo.
cd backend && docker compose up -d --build
node crearAdmin.js && node seedDemo.js      # administrador y datos de demostración

# 2. Frontend
cd .. && npm install && npm run dev          # http://localhost:5173
```

## Publicar en internet

Seguí [`DEPLOY.md`](DEPLOY.md): base de datos en Supabase, app en Vercel y emails con Brevo.
