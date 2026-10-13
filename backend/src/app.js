require('dotenv').config({ override: true });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const prisma = require('./config/prisma');

const authRoutes = require('./routes/auth.routes');
const especialidadRoutes = require('./routes/especialidad.routes');
const medicoRoutes = require('./routes/medico.routes');
const turnoRoutes = require('./routes/turno.routes');
const pacienteRoutes = require('./routes/paciente.routes');
const disponibilidadRoutes = require('./routes/disponibilidad.routes');
const { iniciarVencimientoDeTurnos } = require('./jobs/vencerTurnosPendientes');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Necesario detrás de un proxy (Render, Railway, Heroku, Nginx) para que
// express-rate-limit identifique correctamente la IP real del cliente.
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    // Con credentials:true el navegador NO permite origin:"*" — hace falta
    // una lista explícita, porque el refresh token viaja en una cookie.
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Límite general para toda la API
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Límite estricto para login/registro (mitiga fuerza bruta).
// Cada ruta necesita su PROPIA instancia: express-rate-limit cuenta por IP,
// así que reutilizar una sola instancia para dos rutas distintas hace que
// compartan el mismo cupo de intentos en vez de tener uno independiente cada una.
const crearLimiterAuth = (opciones = {}) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, message: 'Demasiados intentos. Probá de nuevo más tarde.' },
    ...opciones,
  });

// Login: solo cuentan los intentos FALLIDOS (entrar bien no gasta cupo) y hay
// dos límites a la vez: uno por IP + cuenta (frena la fuerza bruta sobre un
// usuario sin bloquear al resto de una red compartida, como una facultad) y
// uno más amplio por IP (frena a quien prueba muchas cuentas distintas).
const limiterLoginPorCuenta = crearLimiterAuth({
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}|${String(req.body?.identificador || '').trim().toLowerCase()}`,
});
const limiterLoginPorIp = crearLimiterAuth({ skipSuccessfulRequests: true, max: 50 });
app.use('/api/auth/login', limiterLoginPorIp, limiterLoginPorCuenta);
app.use('/api/auth/register', crearLimiterAuth());
app.use('/api/auth/olvide-contrasena', crearLimiterAuth());

app.use('/api/auth', authRoutes);
app.use('/api/especialidades', especialidadRoutes);
app.use('/api/medicos', medicoRoutes);
app.use('/api/turnos', turnoRoutes);
app.use('/api/pacientes', pacienteRoutes);
app.use('/api/disponibilidad', disponibilidadRoutes);

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, message: '¡Servidor funcionando!' });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'No se pudo conectar a la base de datos' });
  }
});

// Cualquier ruta no definida
app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'Ruta no encontrada' });
});

// Manejador de errores centralizado (red de seguridad ante errores no atrapados)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    ok: false,
    error: NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
  });
});

const server = app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT} [${NODE_ENV}]`);
  iniciarVencimientoDeTurnos();
});

const apagarConGracia = (signal) => {
  console.log(`\n${signal} recibido. Cerrando servidor...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => apagarConGracia('SIGINT'));
process.on('SIGTERM', () => apagarConGracia('SIGTERM'));

module.exports = app;
