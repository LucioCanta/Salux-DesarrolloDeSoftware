# Guía de despliegue: Supabase (base de datos) + Vercel (app)

Arquitectura: **un solo proyecto de Vercel** sirve el frontend (Vite) y la API (`/api/*`, una función con Express) bajo el mismo dominio. Eso evita CORS y permite que la cookie de sesión (`SameSite=strict`) funcione. La base es PostgreSQL en Supabase, a la que la app se conecta directo con Prisma (no usa la API REST de Supabase).

```
Navegador ──► Vercel (mismo dominio)
              ├─ /            → frontend estático (dist/)
              └─ /api/*       → función api/index.js (Express + Prisma) ──► Supabase (PostgreSQL)
Vercel Cron ──► /api/cron/mantenimiento (1 vez por día)
```

> Las cuentas, los proyectos y las contraseñas los creás vos en cada plataforma. Guardá todo en un gestor de contraseñas; **nunca** lo pegues en el repositorio.

---

## 1. Supabase

1. Entrá a <https://supabase.com> → **New project**.
   - **Region:** South America (São Paulo) (la más cercana a Argentina; Vercel está configurado en `gru1`, también São Paulo).
   - **Database password:** una larga y aleatoria. Guardala.
2. Cuando el proyecto esté listo, abrí **SQL Editor → New query**, pegá el contenido de [`backend/prisma/supabase-setup.sql`](backend/prisma/supabase-setup.sql), **cambiá la contraseña** del rol `salux_app` y ejecutalo. Crea el rol propio de la app (sin superusuario).
3. En **Project Settings → Database → Connection string** (botón *Connect*) copiá dos cadenas y reemplazá usuario y contraseña por los del rol `salux_app` (el usuario del pooler es `salux_app.<id-del-proyecto>`):

   | Variable | Cadena | Para qué |
   |---|---|---|
   | `DATABASE_URL` | **Transaction pooler**, puerto `6543`, agregando al final `?pgbouncer=true&connection_limit=1` | La usa la app en Vercel |
   | `DIRECT_URL` | **Session pooler**, puerto `5432` | Solo para correr migraciones desde tu máquina |

   Ejemplo (los valores de `aws-0-…` los copiás del panel):
   ```
   DATABASE_URL="postgresql://salux_app.abcdefgh:LA_CLAVE@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
   DIRECT_URL="postgresql://salux_app.abcdefgh:LA_CLAVE@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
   ```
   > Usá el *Session pooler* y no la conexión directa (`db.<id>.supabase.co`): esa es solo IPv6 y desde muchas redes domésticas no conecta.

## 2. Crear las tablas y el administrador

Desde tu máquina, en la carpeta `backend/`, con las dos variables de arriba (podés ponerlas temporalmente en `backend/.env`, **sin commitearlas**, o exportarlas en la terminal):

```bash
npx prisma migrate deploy     # crea las tablas, índices y la seguridad (RLS)
node crearAdmin.js            # crea el administrador (usa ADMIN_EMAIL / ADMIN_PASSWORD del .env)
```

Para tener médicos y pacientes de demostración (opcional, **no** con datos reales): `node seedDemo.js`.

Para volver a tu base local, restaurá `DATABASE_URL` / `DIRECT_URL` de tu `.env` a las de Docker.

> Después de migrar, en Supabase → **Table Editor** vas a ver las tablas con el aviso "RLS enabled": es correcto y es lo que impide que la API pública de Supabase lea tus datos.

## 3. Vercel

1. <https://vercel.com> → **Add New → Project** → importá el repositorio de GitHub.
2. Configuración: **Framework Preset: Vite**, **Root Directory: `./`** (la raíz), el resto por defecto (`vercel.json` ya define build y rutas).
3. **Environment Variables** (Production). Las marcadas 🔒 son secretos:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` 🔒 | la del *Transaction pooler* (paso 1.3) |
   | `DIRECT_URL` 🔒 | la del *Session pooler* (Prisma la pide al generar el cliente) |
   | `JWT_SECRET` 🔒 | 64 bytes aleatorios: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
   | `JWT_REFRESH_SECRET` 🔒 | otro distinto, generado igual |
   | `NODE_ENV` | `production` |
   | `TRUST_PROXY` | `1` |
   | `CORS_ORIGIN` | la URL final, `https://TU-PROYECTO.vercel.app` (o tu dominio) |
   | `RATE_LIMIT_STORE` | `db` |
   | `CRON_SECRET` 🔒 | texto aleatorio largo (Vercel lo manda al cron) |
   | `REQUIERE_VERIFICACION_EMAIL` | `true` (necesita SMTP, ver paso 4) |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` 🔒, `EMAIL_FROM` | ver paso 4 |

   La URL final solo la sabés después del primer deploy: hacé el primer deploy, copiá la URL, completá `CORS_ORIGIN` y volvé a desplegar (**Deployments → ⋯ → Redeploy**).
4. Probá: abrí la URL, iniciá sesión con el administrador. Si algo falla, **Deployments → Functions/Logs** muestra el motivo; si la configuración es insegura o incompleta, la función se niega a arrancar y el log dice exactamente qué falta.

### Qué hace distinto en Vercel
- **Tarea de mantenimiento** (cancelar turnos pendientes vencidos, limpiar sesiones y contadores): corre por **Vercel Cron una vez por día** (límite del plan gratuito). Si querés que corra cada 10 minutos, activá la extensión `pg_cron` de Supabase (Database → Extensions) y programá `select cron.schedule(...)` con el mismo SQL.
- **Límites de intentos** (login, registro...): se guardan en la tabla `RateLimitContador` de la base (en serverless no hay memoria compartida).
- **Emails**: se envían con `waitUntil` para que no se corten cuando termina la respuesta.

## 4. Emails con Brevo (después de tener la app desplegada)

Brevo necesita un **remitente verificado**, y lo ideal es un **dominio propio** (para que los mails no caigan en spam). Con la app ya desplegada:

1. Creá la cuenta en <https://www.brevo.com> y, en **Senders, domains & dedicated IPs**, verificá tu dominio (te da registros DNS: SPF, DKIM, DMARC) o, como mínimo, un remitente individual.
2. **SMTP & API → SMTP**: generá una clave SMTP. Servidor `smtp-relay.brevo.com`, puerto `587`, usuario = tu login SMTP de Brevo.
3. En Vercel cargá `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS` y `EMAIL_FROM="Salux <no-reply@tudominio.com>"` y redesplegá. No hace falta tocar código.

## 5. Antes de usar datos reales
- Cambiá todas las contraseñas de prueba y la del administrador inicial.
- Los datos de salud son **datos personales sensibles** (Ley 25.326 de Protección de Datos Personales): definí quién accede, para qué, y por cuánto tiempo se guardan.
- Los proyectos gratuitos de Supabase se **pausan por inactividad** y no tienen restauración a un punto en el tiempo: para uso real conviene un plan con backups.
- El plan *Hobby* de Vercel es solo para uso no comercial.
