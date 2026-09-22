const prisma = require('../config/prisma');
const { emailTurnoCreado, emailTurnoConfirmado, emailTurnoCancelado } = require('../utils/email');
const { diaCalendarioUTC, diaSemanaYMinutosArgentina } = require('../utils/fechas');

function formatearFechaHora(fecha) {
  const fechaTexto = fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const horaTexto = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return { fechaTexto, horaTexto };
}

// Valida que `inicio` sea un horario reservable para `medico`: activo, fuera
// de sus ausencias puntuales, dentro de su disponibilidad semanal (si
// configuró alguna) y sin choques con otro turno del paciente o del médico.
// La usan tanto crearTurno como reprogramarTurno — en esta última,
// `excluirTurnoId` deja afuera de los chequeos de choque al turno que se
// está moviendo (si no, chocaría contra sí mismo).
async function validarHorarioParaTurno({ medico, inicio, pacienteId, excluirTurnoId }) {
  if (!medico.usuario.activo) {
    return { ok: false, status: 422, message: 'Ese médico no está disponible actualmente' };
  }

  const duracionTurnoMinutos = medico.duracionTurnoMinutos;

  // Ausencia puntual (vacaciones, un día que avisó que no atiende)
  const diaDelTurno = diaCalendarioUTC(inicio);
  const dentroDeAusencia = (medico.ausencias || []).some((a) => {
    const desde = diaCalendarioUTC(a.fechaInicio);
    const hasta = diaCalendarioUTC(a.fechaFin);
    return diaDelTurno >= desde && diaDelTurno <= hasta;
  });
  if (dentroDeAusencia) {
    return { ok: false, status: 422, message: 'El médico no atiende ese día (tiene una ausencia registrada)' };
  }

  // Si el médico ya cargó su disponibilidad semanal, el turno tiene que caer
  // completo dentro de alguna franja. Un médico sin ninguna franja cargada
  // todavía (no configuró el módulo) queda sin esta restricción, por
  // compatibilidad con los que ya existían antes de este módulo.
  if (medico.disponibilidades.length > 0) {
    // OJO: NO usar inicio.getDay()/getHours() acá — dependen de la zona
    // horaria del proceso (en Docker, UTC), pero las franjas se definieron
    // pensando en hora Argentina. Sin esta traducción, cualquier turno con
    // disponibilidad configurada se rechaza siempre (se comprobó con un
    // caso real: "09:00 Argentina" el backend lo leía como "12:00").
    const { diaSemana, minutosDelDia: minutosInicio } = diaSemanaYMinutosArgentina(inicio);
    const minutosFin = minutosInicio + duracionTurnoMinutos;
    const dentroDeDisponibilidad = medico.disponibilidades.some(
      (f) => f.diaSemana === diaSemana && f.horaInicioMinutos <= minutosInicio && f.horaFinMinutos >= minutosFin
    );
    if (!dentroDeDisponibilidad) {
      return { ok: false, status: 422, message: 'Ese horario no está dentro de la disponibilidad del médico' };
    }
  }

  // El paciente no puede tener dos turnos en el mismo horario, aunque sea con médicos distintos
  const turnoPacienteMismaHora = await prisma.turno.findFirst({
    where: {
      pacienteId,
      fechaYhora: inicio,
      estado: { not: 'CANCELADO' },
      ...(excluirTurnoId ? { idTurno: { not: excluirTurnoId } } : {}),
    }
  });
  if (turnoPacienteMismaHora) {
    return { ok: false, status: 409, message: 'Ya tenés un turno reservado en ese mismo horario' };
  }

  // El médico no puede tener dos turnos que se superpongan en el tiempo
  // (una reserva "ocupa" duracionTurnoMinutos a partir de su hora de inicio)
  const ventanaInicio = new Date(inicio.getTime() - duracionTurnoMinutos * 60 * 1000);
  const ventanaFin = new Date(inicio.getTime() + duracionTurnoMinutos * 60 * 1000);
  const turnoSuperpuesto = await prisma.turno.findFirst({
    where: {
      medicoId: medico.idMedico,
      estado: { not: 'CANCELADO' },
      fechaYhora: { gt: ventanaInicio, lt: ventanaFin },
      ...(excluirTurnoId ? { idTurno: { not: excluirTurnoId } } : {}),
    }
  });
  if (turnoSuperpuesto) {
    return {
      ok: false,
      status: 409,
      message: `Ese médico ya tiene un turno dentro de los ${duracionTurnoMinutos} minutos de ese horario`
    };
  }

  return { ok: true };
}

// 1. Crear un turno nuevo
const crearTurno = async (req, res) => {
  try {
    // medicoId y fechaYhora ya vienen validados (y fechaYhora garantizada a futuro) por Zod
    const { medicoId, fechaYhora } = req.body;
    const usuarioId = req.usuario.id;
    const inicio = new Date(fechaYhora);

    const [paciente, medico] = await Promise.all([
      prisma.paciente.findUnique({
        where: { usuarioId: usuarioId },
        include: { usuario: { select: { email: true, nomYape: true } } }
      }),
      prisma.medico.findUnique({
        where: { idMedico: medicoId },
        include: { usuario: { select: { activo: true } }, disponibilidades: true, ausencias: true }
      }),
    ]);

    if (!paciente) {
      return res.status(404).json({ ok: false, message: 'Tu usuario no tiene un perfil de paciente asociado' });
    }

    if (!medico) {
      return res.status(404).json({ ok: false, message: 'El médico indicado no existe' });
    }

    const validacion = await validarHorarioParaTurno({ medico, inicio, pacienteId: paciente.idPaciente });
    if (!validacion.ok) {
      return res.status(validacion.status).json({ ok: false, message: validacion.message });
    }

    const nuevoTurno = await prisma.turno.create({
      data: {
        fechaYhora: inicio,
        pacienteId: paciente.idPaciente,
        medicoId: medico.idMedico
      },
      include: {
        medico: {
          include: {
            usuario: {
              select: { nomYape: true }
            },
            especialidades: true
          }
        }
      }
    });

    res.status(201).json({
      ok: true,
      message: '¡Turno reservado con éxito!',
      data: nuevoTurno
    });

    // El email es una cortesía, no una condición para que la reserva sea
    // válida — se dispara después de responder y nunca puede tirar abajo el request.
    const { fechaTexto, horaTexto } = formatearFechaHora(inicio);
    emailTurnoCreado({
      to: paciente.usuario.email,
      nombrePaciente: paciente.usuario.nomYape,
      nombreMedico: nuevoTurno.medico.usuario.nomYape,
      fechaTexto,
      horaTexto,
      consultorio: nuevoTurno.medico.consultorio ? `Consultorio ${nuevoTurno.medico.consultorio}` : 'Consultorio a confirmar',
    }).catch(() => {});

  } catch (error) {
    console.error(error);
    // Red de seguridad ante una carrera entre dos reservas simultáneas que
    // los chequeos de arriba no llegaron a atajar a tiempo.
    if (error.code === 'P2002') {
      const indice = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target || '');
      if (indice.includes('pacienteId')) {
        return res.status(409).json({ ok: false, message: 'Ya tenés un turno reservado en ese mismo horario' });
      }
      return res.status(409).json({ ok: false, message: 'Ese médico ya tiene un turno reservado en ese horario' });
    }
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

// 2. Obtener los turnos del paciente logueado
const obtenerMisTurnos = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const paciente = await prisma.paciente.findUnique({
      where: { usuarioId: usuarioId }
    });

    if (!paciente) {
      return res.status(404).json({ ok: false, message: 'Tu usuario no tiene un perfil de paciente asociado' });
    }

    const misTurnos = await prisma.turno.findMany({
      where: { pacienteId: paciente.idPaciente },
      orderBy: { fechaYhora: 'asc' },
      include: {
        medico: {
          include: {
            usuario: {
              select: { nomYape: true }
            },
            especialidades: true
          }
        }
      }
    });

    res.json({
      ok: true,
      data: misTurnos
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

// 3. Actualizar el estado de un turno
const actualizarEstadoTurno = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body; // ya validado por Zod
    const idTurno = parseInt(id, 10);

    if (Number.isNaN(idTurno)) {
      return res.status(400).json({ ok: false, message: 'id de turno inválido' });
    }

    const turno = await prisma.turno.findUnique({
      where: { idTurno },
      include: {
        paciente: { select: { usuarioId: true, usuario: { select: { email: true, nomYape: true } } } },
        medico: { select: { usuarioId: true, usuario: { select: { nomYape: true } } } }
      }
    });

    if (!turno) {
      return res.status(404).json({ ok: false, message: 'Turno no encontrado' });
    }

    // Autorización: solo el paciente dueño, el médico dueño o un admin pueden tocar el turno
    const usuarioId = req.usuario.id;
    const esPaciente = turno.paciente.usuarioId === usuarioId;
    const esMedico = turno.medico.usuarioId === usuarioId;
    let esAdmin = false;

    if (!esPaciente && !esMedico) {
      const admin = await prisma.administrador.findUnique({ where: { usuarioId } });
      esAdmin = !!admin;
    }

    if (!esPaciente && !esMedico && !esAdmin) {
      return res.status(403).json({ ok: false, message: 'Acceso denegado: no participás en este turno' });
    }

    // Un paciente solo puede cancelar su propio turno, no confirmarlo ni finalizarlo
    if (esPaciente && !esMedico && !esAdmin && estado !== 'CANCELADO') {
      return res.status(403).json({ ok: false, message: 'Como paciente solo podés cancelar tu turno' });
    }

    // Los estados finales no admiten más transiciones (evita "revivir" un turno ya cerrado).
    // 422: la petición está bien formada, pero viola una regla de negocio (máquina de estados).
    if (turno.estado === 'FINALIZADO' || turno.estado === 'CANCELADO') {
      return res.status(422).json({
        ok: false,
        message: `El turno ya está ${turno.estado.toLowerCase()} y no admite más cambios`
      });
    }

    const turnoActualizado = await prisma.turno.update({
      where: { idTurno },
      data: { estado }
    });

    res.json({
      ok: true,
      message: `El turno ahora está: ${estado}`,
      data: turnoActualizado
    });

    // Avisamos por email solo en los cambios que le importan al paciente —
    // nunca bloquea ni puede hacer fallar la respuesta que ya se envió.
    if (estado === 'CONFIRMADO' || estado === 'CANCELADO') {
      const { fechaTexto, horaTexto } = formatearFechaHora(new Date(turnoActualizado.fechaYhora));
      const datosEmail = {
        to: turno.paciente.usuario.email,
        nombrePaciente: turno.paciente.usuario.nomYape,
        nombreMedico: turno.medico.usuario.nomYape,
        fechaTexto,
        horaTexto,
      };
      const enviar = estado === 'CONFIRMADO' ? emailTurnoConfirmado : emailTurnoCancelado;
      enviar(datosEmail).catch(() => {});
    }

  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ ok: false, message: 'Turno no encontrado' });
    }
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};
// 3.1 Reprogramar un turno propio: lo mueve a un horario nuevo, re-validando
// todas las mismas reglas que crearTurno (disponibilidad, ausencias,
// choques). Vuelve a PENDIENTE porque el horario cambió y el médico tiene
// que reconfirmarlo — y el paciente, re-confirmar su asistencia.
const reprogramarTurno = async (req, res) => {
  try {
    const idTurno = parseInt(req.params.id, 10);
    if (Number.isNaN(idTurno)) {
      return res.status(400).json({ ok: false, message: 'id de turno inválido' });
    }
    const { fechaYhora } = req.body; // ya validado por Zod (fecha futura)
    const inicio = new Date(fechaYhora);
    const usuarioId = req.usuario.id;

    const turno = await prisma.turno.findUnique({
      where: { idTurno },
      include: { paciente: { select: { usuarioId: true, idPaciente: true } } }
    });

    if (!turno) {
      return res.status(404).json({ ok: false, message: 'Turno no encontrado' });
    }

    if (turno.paciente.usuarioId !== usuarioId) {
      return res.status(403).json({ ok: false, message: 'No podés reprogramar un turno que no es tuyo' });
    }

    if (turno.estado === 'FINALIZADO' || turno.estado === 'CANCELADO') {
      return res.status(422).json({
        ok: false,
        message: `El turno ya está ${turno.estado.toLowerCase()} y no se puede reprogramar`
      });
    }

    const medico = await prisma.medico.findUnique({
      where: { idMedico: turno.medicoId },
      include: { usuario: { select: { activo: true } }, disponibilidades: true, ausencias: true }
    });
    if (!medico) {
      return res.status(404).json({ ok: false, message: 'El médico de este turno ya no existe' });
    }

    const validacion = await validarHorarioParaTurno({
      medico,
      inicio,
      pacienteId: turno.paciente.idPaciente,
      excluirTurnoId: idTurno,
    });
    if (!validacion.ok) {
      return res.status(validacion.status).json({ ok: false, message: validacion.message });
    }

    const turnoActualizado = await prisma.turno.update({
      where: { idTurno },
      data: {
        fechaYhora: inicio,
        estado: 'PENDIENTE',
        confirmadoPorPaciente: false,
      },
      include: {
        medico: {
          include: {
            usuario: { select: { nomYape: true } },
            especialidades: true
          }
        }
      }
    });

    res.json({ ok: true, message: 'Turno reprogramado con éxito', data: turnoActualizado });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') {
      return res.status(409).json({ ok: false, message: 'Ese horario ya no está disponible' });
    }
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

// 3.2 El paciente confirma que va a asistir a su turno — señal aparte de que
// el médico/admin lo haya confirmado, pensada para bajar el ausentismo.
const confirmarAsistencia = async (req, res) => {
  try {
    const idTurno = parseInt(req.params.id, 10);
    if (Number.isNaN(idTurno)) {
      return res.status(400).json({ ok: false, message: 'id de turno inválido' });
    }

    const turno = await prisma.turno.findUnique({
      where: { idTurno },
      include: { paciente: { select: { usuarioId: true } } }
    });

    if (!turno) {
      return res.status(404).json({ ok: false, message: 'Turno no encontrado' });
    }

    if (turno.paciente.usuarioId !== req.usuario.id) {
      return res.status(403).json({ ok: false, message: 'No podés confirmar un turno que no es tuyo' });
    }

    if (turno.estado === 'FINALIZADO' || turno.estado === 'CANCELADO') {
      return res.status(422).json({
        ok: false,
        message: `El turno ya está ${turno.estado.toLowerCase()} y no admite confirmación`
      });
    }

    const turnoActualizado = await prisma.turno.update({
      where: { idTurno },
      data: { confirmadoPorPaciente: true }
    });

    res.json({ ok: true, message: 'Confirmaste tu asistencia', data: turnoActualizado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

// ... (acá arriba están crearTurno, obtenerMisTurnos, actualizarEstadoTurno) ...

// 4. Obtener la agenda del médico logueado
const obtenerTurnosMedico = async (req, res) => {
  try {
    const usuarioId = req.usuario.id; // Extraemos el ID del token

    // 1. Verificamos que este usuario realmente sea un médico
    const medico = await prisma.medico.findUnique({
      where: { usuarioId: usuarioId }
    });

    if (!medico) {
      return res.status(403).json({ ok: false, message: 'Acceso denegado: Tu perfil no es de médico' });
    }

    // 2. Buscamos los turnos de este médico y los ordenamos por fecha
    const agenda = await prisma.turno.findMany({
      where: { medicoId: medico.idMedico },
      orderBy: { fechaYhora: 'asc' },
      include: {
        // Le decimos a Prisma que traiga los datos del paciente asociado a cada turno
        paciente: {
          select: {
            obraSocial: true,
            telefono: true,
            usuario: {
              select: {
                nomYape: true,
                email: true
              }
            }
          }
        }
      }
    });

    res.json({
      ok: true,
      data: agenda
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

// 5. Obtener todos los turnos de todos los pacientes (solo Administradores)
const obtenerTodosLosTurnos = async (req, res) => {
  try {
    const turnos = await prisma.turno.findMany({
      orderBy: { fechaYhora: 'asc' },
      include: {
        paciente: {
          select: {
            usuario: { select: { nomYape: true, email: true } }
          }
        },
        medico: {
          include: {
            usuario: { select: { nomYape: true } },
            especialidades: true
          }
        }
      }
    });

    res.json({
      ok: true,
      data: turnos
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

// Exportamos todas las funciones juntas
module.exports = {
  crearTurno,
  obtenerMisTurnos,
  actualizarEstadoTurno,
  reprogramarTurno,
  confirmarAsistencia,
  obtenerTurnosMedico, // <-- ¡No te olvides de agregarla acá!
  obtenerTodosLosTurnos
};