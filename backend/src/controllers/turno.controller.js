const prisma = require('../config/prisma');

// 1. Crear un turno nuevo
const crearTurno = async (req, res) => {
  try {
    // medicoId y fechaYhora ya vienen validados (y fechaYhora garantizada a futuro) por Zod
    const { medicoId, fechaYhora } = req.body;
    const usuarioId = req.usuario.id;

    const paciente = await prisma.paciente.findUnique({
      where: { usuarioId: usuarioId }
    });

    if (!paciente) {
      return res.status(404).json({ ok: false, message: 'Tu usuario no tiene un perfil de paciente asociado' });
    }

    const medico = await prisma.medico.findUnique({
      where: { idMedico: medicoId }
    });

    if (!medico) {
      return res.status(404).json({ ok: false, message: 'El médico indicado no existe' });
    }

    const nuevoTurno = await prisma.turno.create({
      data: {
        fechaYhora: new Date(fechaYhora),
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

  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') {
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
        paciente: { select: { usuarioId: true } },
        medico: { select: { usuarioId: true } }
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

    const turnoActualizado = await prisma.turno.update({
      where: { idTurno },
      data: { estado }
    });

    res.json({
      ok: true,
      message: `El turno ahora está: ${estado}`,
      data: turnoActualizado
    });

  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ ok: false, message: 'Turno no encontrado' });
    }
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

// Exportamos todas las funciones juntas
module.exports = {
  crearTurno,
  obtenerMisTurnos,
  actualizarEstadoTurno,
  obtenerTurnosMedico // <-- ¡No te olvides de agregarla acá!
};