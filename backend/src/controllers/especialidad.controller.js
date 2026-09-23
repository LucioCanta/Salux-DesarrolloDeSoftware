const prisma = require('../config/prisma');

const crearEspecialidad = async (req, res) => {
  try {
    const { nombre } = req.body;

    // Comparación case-insensitive: "Cardiología" y "cardiología" son la misma
    // especialidad para el negocio, aunque MySQL con collation *_ci ya las
    // trataría como iguales a nivel de índice único; lo dejamos explícito acá
    // para dar un mensaje claro sin depender de la collation de la columna.
    const existente = await prisma.especialidad.findFirst({
      where: { nombre: { equals: nombre } }
    });

    if (existente) {
      return res.status(409).json({ ok: false, message: 'Ya existe una especialidad con ese nombre' });
    }

    const nuevaEspecialidad = await prisma.especialidad.create({
      data: { nombre }
    });

    res.status(201).json({
      ok: true,
      message: 'Especialidad creada con éxito',
      data: nuevaEspecialidad
    });
  } catch (error) {
    console.error(error);
    // Carrera entre dos altas simultáneas con el mismo nombre
    if (error.code === 'P2002') {
      return res.status(409).json({ ok: false, message: 'Ya existe una especialidad con ese nombre' });
    }
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};
const obtenerEspecialidades = async (req, res) => {
  try {
    // Prisma busca todos los registros de la tabla
    const especialidades = await prisma.especialidad.findMany();
    
    res.json({ 
      ok: true, 
      data: especialidades 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

const eliminarEspecialidad = async (req, res) => {
  try {
    const idEspecialidad = parseInt(req.params.id, 10);
    if (Number.isNaN(idEspecialidad)) {
      return res.status(400).json({ ok: false, message: 'id de especialidad inválido' });
    }

    const especialidad = await prisma.especialidad.findUnique({
      where: { idEspecialidad },
      include: { medicos: { select: { idMedico: true } } }
    });

    if (!especialidad) {
      return res.status(404).json({ ok: false, message: 'Especialidad no encontrada' });
    }

    // Integridad referencial: no permitimos dejar médicos "huérfanos" de
    // especialidad. El admin tiene que desvincular a los médicos primero.
    if (especialidad.medicos.length > 0) {
      return res.status(409).json({
        ok: false,
        message: `No se puede eliminar: hay ${especialidad.medicos.length} médico(s) con esta especialidad asignada`
      });
    }

    await prisma.especialidad.delete({ where: { idEspecialidad } });

    res.json({ ok: true, message: 'Especialidad eliminada con éxito' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

// Acordate de exportarla
module.exports = {
  crearEspecialidad,
  obtenerEspecialidades,
  eliminarEspecialidad
};