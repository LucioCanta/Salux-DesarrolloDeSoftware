const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

const crearMedico = async (req, res) => {
  try {
    // 1. Recibimos los datos del usuario + los datos del médico (ya validados por Zod)
    const { email, dni, contrasena, nomYape, matricula, consultorio, especialidadesIds } = req.body;

    // 2. Verificamos si el email o dni ya existen en el sistema
    const usuarioExistente = await prisma.usuario.findFirst({
      where: { OR: [{ email }, { dni }] }
    });

    if (usuarioExistente) {
      return res.status(400).json({ ok: false, message: 'El email o DNI ya están registrados' });
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
            // Como es una lista (array) de IDs, Prisma necesita mapearlos para conectarlos
            especialidades: {
              connect: especialidadesIds.map(id => ({ idEspecialidad: id }))
            }
          }
        }
      },
      // Le pedimos a Prisma que nos devuelva los datos armados para verlos en la respuesta
      include: {
        medico: {
          include: {
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
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};
const obtenerMedicos = async (req, res) => {
  try {
    const medicos = await prisma.medico.findMany({
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

// Acordate de actualizar la exportación para incluir la nueva función
module.exports = {
  crearMedico,
  obtenerMedicos
};