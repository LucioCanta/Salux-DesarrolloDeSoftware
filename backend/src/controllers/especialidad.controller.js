const prisma = require('../config/prisma');

const crearEspecialidad = async (req, res) => {
  try {
    const { nombre } = req.body;

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

// Acordate de exportarla
module.exports = {
  crearEspecialidad,
  obtenerEspecialidades
};