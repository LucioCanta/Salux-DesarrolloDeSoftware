const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { diaCalendarioUTC, OFFSET_ARGENTINA_MINUTOS } = require('../utils/fechas');

const MINUTOS_ANTICIPACION = 60;
const LIMITE_DIAS_PROXIMA_DISPONIBILIDAD = 30;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

// Primer horario libre de un médico dentro de los próximos 30 días, para que
// el paciente pueda comparar médicos sin tener que entrar a cada uno. Usa
// exactamente el mismo criterio que crearTurno (disponibilidad semanal,
// ausencias, choques con turnos ya reservados) para no prometer un horario
// que después el backend va a rechazar. Si el médico no cargó ninguna franja
// todavía, devolvemos null — no tiene sentido "prometer" un horario dentro
// de un rango sin restricciones que no configuró.
async function calcularProximaDisponibilidad(medico) {
  if (!medico.disponibilidades || medico.disponibilidades.length === 0) return null;

  const ahora = new Date();
  const minimoMs = ahora.getTime() + MINUTOS_ANTICIPACION * 60 * 1000;
  const limiteFecha = new Date(ahora.getTime() + LIMITE_DIAS_PROXIMA_DISPONIBILIDAD * UN_DIA_MS);

  const turnosExistentes = await prisma.turno.findMany({
    where: {
      medicoId: medico.idMedico,
      estado: { not: 'CANCELADO' },
      fechaYhora: { gte: ahora, lte: limiteFecha },
    },
    select: { fechaYhora: true },
  });
  const ocupados = new Set(turnosExistentes.map((t) => t.fechaYhora.getTime()));

  const duracion = medico.duracionTurnoMinutos;

  // Trabajamos en "tiempo corrido" (ahora - offset Argentina): truncar ESE
  // valor a medianoche da la medianoche de hoy en Argentina expresada en ms
  // UTC, sin depender de en qué huso corre el proceso. Sumarle minutos y
  // luego el offset de vuelta da el instante UTC real de ese horario
  // Argentina — el mismo truco que diaSemanaYMinutosArgentina pero en
  // sentido inverso (de "minutos Argentina" a instante UTC).
  const ahoraCorridoMs = ahora.getTime() - OFFSET_ARGENTINA_MINUTOS * 60 * 1000;
  const medianocheHoyCorridoMs = Math.floor(ahoraCorridoMs / UN_DIA_MS) * UN_DIA_MS;

  for (let d = 0; d < LIMITE_DIAS_PROXIMA_DISPONIBILIDAD; d++) {
    const medianocheDiaCorridoMs = medianocheHoyCorridoMs + d * UN_DIA_MS;
    const diaSemana = new Date(medianocheDiaCorridoMs).getUTCDay();
    const diaStr = diaCalendarioUTC(medianocheDiaCorridoMs);

    const enAusencia = (medico.ausencias || []).some((a) => {
      const desde = diaCalendarioUTC(a.fechaInicio);
      const hasta = diaCalendarioUTC(a.fechaFin);
      return diaStr >= desde && diaStr <= hasta;
    });
    if (enAusencia) continue;

    const franjasDelDia = medico.disponibilidades.filter((f) => f.diaSemana === diaSemana);
    for (const franja of franjasDelDia) {
      for (let m = franja.horaInicioMinutos; m + duracion <= franja.horaFinMinutos; m += duracion) {
        const slotMs = medianocheDiaCorridoMs + m * 60 * 1000 + OFFSET_ARGENTINA_MINUTOS * 60 * 1000;
        if (slotMs < minimoMs) continue;
        if (ocupados.has(slotMs)) continue;
        return new Date(slotMs);
      }
    }
  }

  return null;
}

const crearMedico = async (req, res) => {
  try {
    // 1. Recibimos los datos del usuario + los datos del médico (ya validados por Zod)
    const { email, dni, contrasena, nomYape, matricula, consultorio, especialidadesIds, duracionTurnoMinutos } = req.body;

    // 2. Verificamos si el email, dni o matrícula ya existen en el sistema
    const [usuarioExistente, matriculaExistente] = await Promise.all([
      prisma.usuario.findFirst({ where: { OR: [{ email }, { dni }] } }),
      prisma.medico.findUnique({ where: { matricula } }),
    ]);

    if (usuarioExistente) {
      return res.status(409).json({ ok: false, message: 'El email o DNI ya están registrados' });
    }
    if (matriculaExistente) {
      return res.status(409).json({ ok: false, message: 'Esa matrícula ya está registrada' });
    }

    // 4. Encriptamos la contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 12);

    // 5. Magia de Prisma: Creamos Usuario, su perfil de Médico y lo conectamos a las Especialidades
    const nuevoMedico = await prisma.usuario.create({
      data: {
        email,
        dni,
        contrasena: hashedPassword,
        nomYape,
        medico: {
          create: {
            matricula,
            consultorio,
            // Si no se manda, Prisma aplica el default de la columna (30)
            ...(duracionTurnoMinutos != null ? { duracionTurnoMinutos } : {}),
            // Como es una lista (array) de IDs, Prisma necesita mapearlos para conectarlos
            especialidades: {
              connect: especialidadesIds.map(id => ({ idEspecialidad: id }))
            }
          }
        }
      },
      // select explícito: NUNCA devolver la contraseña hasheada en la respuesta
      select: {
        idUsuario: true,
        email: true,
        nomYape: true,
        medico: {
          select: {
            idMedico: true,
            matricula: true,
            consultorio: true,
            duracionTurnoMinutos: true,
            especialidades: true
          }
        }
      }
    });

    res.status(201).json({
      ok: true,
      message: 'Médico registrado con éxito',
      data: nuevoMedico
    });

  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return res.status(400).json({ ok: false, message: 'Una o más especialidades no existen' });
    }
    // Carrera entre dos altas simultáneas con el mismo email/dni/matrícula
    if (error.code === 'P2002') {
      return res.status(409).json({ ok: false, message: 'El email, DNI o matrícula ya están registrados' });
    }
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};
const obtenerMedicos = async (req, res) => {
  try {
    const medicos = await prisma.medico.findMany({
      where: { usuario: { activo: true } },
      include: {
        // Traemos los datos del usuario, pero seleccionamos qué campos mostrar por seguridad
        usuario: {
          select: {
            idUsuario: true,
            nomYape: true,
            email: true,
            activo: true
          }
        },
        // Traemos las especialidades vinculadas
        especialidades: true,
        disponibilidades: true,
        ausencias: true,
      }
    });

    // Se calcula por médico (consulta propia de turnos existentes cada uno),
    // así que van todas en paralelo en vez de una por una.
    const medicosConDisponibilidad = await Promise.all(
      medicos.map(async (m) => ({ ...m, proximaDisponibilidad: await calcularProximaDisponibilidad(m) }))
    );

    res.json({
      ok: true,
      data: medicosConDisponibilidad
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

// Lista TODOS los médicos (activos e inactivos) con sus datos completos —
// a diferencia de obtenerMedicos (que filtra solo activos, para el flujo de
// reserva de turnos del paciente), esta es para la data table del panel de
// administración, donde el admin necesita ver y poder reactivar inactivos.
const obtenerTodosLosMedicos = async (req, res) => {
  try {
    const medicos = await prisma.medico.findMany({
      orderBy: { idMedico: 'asc' },
      include: {
        usuario: {
          select: { idUsuario: true, nomYape: true, email: true, dni: true, activo: true }
        },
        especialidades: true
      }
    });

    res.json({
      ok: true,
      data: medicos
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

// Activa/desactiva la cuenta del médico (reutiliza el flag Usuario.activo,
// el mismo que ya usan login/verificarToken para bloquear el acceso).
const cambiarEstadoMedico = async (req, res) => {
  try {
    const idMedico = parseInt(req.params.id, 10);
    if (Number.isNaN(idMedico)) {
      return res.status(400).json({ ok: false, message: 'id de médico inválido' });
    }
    const { activo } = req.body;

    const medico = await prisma.medico.findUnique({ where: { idMedico }, select: { usuarioId: true } });
    if (!medico) {
      return res.status(404).json({ ok: false, message: 'Médico no encontrado' });
    }

    const usuario = await prisma.usuario.update({
      where: { idUsuario: medico.usuarioId },
      data: { activo },
      select: { idUsuario: true, activo: true }
    });

    res.json({
      ok: true,
      message: `Médico ${activo ? 'activado' : 'desactivado'} con éxito`,
      data: usuario
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

// Edita los datos operativos del médico (consultorio, duración de turno).
// Los datos de identidad (nombre, email, dni, matrícula) no se tocan acá.
const actualizarMedico = async (req, res) => {
  try {
    const idMedico = parseInt(req.params.id, 10);
    if (Number.isNaN(idMedico)) {
      return res.status(400).json({ ok: false, message: 'id de médico inválido' });
    }

    const { consultorio, duracionTurnoMinutos } = req.body;
    if (consultorio === undefined && duracionTurnoMinutos === undefined) {
      return res.status(400).json({ ok: false, message: 'No se envió ningún campo para actualizar' });
    }

    const medico = await prisma.medico.update({
      where: { idMedico },
      data: {
        ...(consultorio !== undefined ? { consultorio } : {}),
        ...(duracionTurnoMinutos !== undefined ? { duracionTurnoMinutos } : {}),
      },
      include: {
        usuario: { select: { nomYape: true, email: true, dni: true, activo: true } },
        especialidades: true
      }
    });

    res.json({ ok: true, message: 'Médico actualizado con éxito', data: medico });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ ok: false, message: 'Médico no encontrado' });
    }
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

// Acordate de actualizar la exportación para incluir la nueva función
module.exports = {
  crearMedico,
  obtenerMedicos,
  obtenerTodosLosMedicos,
  cambiarEstadoMedico,
  actualizarMedico
};