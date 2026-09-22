const prisma = require('../config/prisma');

// Todas las rutas de este controller son para el médico logueado, así que
// resolvemos su idMedico a partir del usuario del token en cada una.
async function resolverMedico(usuarioId) {
  return prisma.medico.findUnique({ where: { usuarioId } });
}

const crearDisponibilidad = async (req, res) => {
  try {
    const medico = await resolverMedico(req.usuario.id);
    if (!medico) {
      return res.status(403).json({ ok: false, message: 'Acceso denegado: tu perfil no es de médico' });
    }

    const { diaSemana, horaInicioMinutos, horaFinMinutos } = req.body;

    // Dos franjas del mismo día se superponen si una empieza antes de que la otra termine y viceversa
    const franjas = await prisma.disponibilidad.findMany({ where: { medicoId: medico.idMedico, diaSemana } });
    const seSuperpone = franjas.some(
      (f) => horaInicioMinutos < f.horaFinMinutos && horaFinMinutos > f.horaInicioMinutos
    );
    if (seSuperpone) {
      return res.status(409).json({ ok: false, message: 'Esa franja se superpone con otra que ya tenés cargada ese día' });
    }

    const nueva = await prisma.disponibilidad.create({
      data: { diaSemana, horaInicioMinutos, horaFinMinutos, medicoId: medico.idMedico },
    });

    res.status(201).json({ ok: true, message: 'Franja horaria agregada', data: nueva });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') {
      return res.status(409).json({ ok: false, message: 'Ya tenés esa franja horaria cargada' });
    }
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

const obtenerMisDisponibilidades = async (req, res) => {
  try {
    const medico = await resolverMedico(req.usuario.id);
    if (!medico) {
      return res.status(403).json({ ok: false, message: 'Acceso denegado: tu perfil no es de médico' });
    }

    const disponibilidades = await prisma.disponibilidad.findMany({
      where: { medicoId: medico.idMedico },
      orderBy: [{ diaSemana: 'asc' }, { horaInicioMinutos: 'asc' }],
    });

    res.json({ ok: true, data: disponibilidades });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

const eliminarDisponibilidad = async (req, res) => {
  try {
    const medico = await resolverMedico(req.usuario.id);
    if (!medico) {
      return res.status(403).json({ ok: false, message: 'Acceso denegado: tu perfil no es de médico' });
    }

    const idDisponibilidad = parseInt(req.params.id, 10);
    if (Number.isNaN(idDisponibilidad)) {
      return res.status(400).json({ ok: false, message: 'id de franja horaria inválido' });
    }

    const franja = await prisma.disponibilidad.findUnique({ where: { idDisponibilidad } });
    if (!franja) {
      return res.status(404).json({ ok: false, message: 'Franja horaria no encontrada' });
    }
    if (franja.medicoId !== medico.idMedico) {
      return res.status(403).json({ ok: false, message: 'Esa franja horaria no te pertenece' });
    }

    await prisma.disponibilidad.delete({ where: { idDisponibilidad } });

    res.json({ ok: true, message: 'Franja horaria eliminada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

// Para el wizard de "Solicitar turno" del paciente: la disponibilidad de un
// médico puntual, para generar los horarios reales en vez de un rango fijo.
const obtenerDisponibilidadDeMedico = async (req, res) => {
  try {
    const medicoId = parseInt(req.params.medicoId, 10);
    if (Number.isNaN(medicoId)) {
      return res.status(400).json({ ok: false, message: 'id de médico inválido' });
    }

    const medico = await prisma.medico.findUnique({ where: { idMedico: medicoId }, select: { idMedico: true, duracionTurnoMinutos: true } });
    if (!medico) {
      return res.status(404).json({ ok: false, message: 'Médico no encontrado' });
    }

    const disponibilidades = await prisma.disponibilidad.findMany({
      where: { medicoId },
      orderBy: [{ diaSemana: 'asc' }, { horaInicioMinutos: 'asc' }],
    });

    res.json({ ok: true, data: { duracionTurnoMinutos: medico.duracionTurnoMinutos, disponibilidades } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

module.exports = {
  crearDisponibilidad,
  obtenerMisDisponibilidades,
  eliminarDisponibilidad,
  obtenerDisponibilidadDeMedico,
};
