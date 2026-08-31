const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

const register = async (req, res) => {
  try {
    // 1. Recibimos los datos del cliente (React)
    const { email, dni, contrasena, nomYape } = req.body;

    // 2. Verificamos si el usuario ya existe
    const usuarioExistente = await prisma.usuario.findFirst({
      where: {
        OR: [{ email }, { dni }]
      }
    });

    if (usuarioExistente) {
      return res.status(400).json({ ok: false, message: 'El email o DNI ya está registrado' });
    }

    // 3. Hasheamos la contraseña con bcrypt (12 salt rounds como pide el documento)
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

    // 4. Creamos el Usuario y su perfil de Paciente asociado en una sola transacción
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        email,
        dni,
        contrasena: hashedPassword,
        nomYape,
        // El documento pide que se asigne el rol paciente por defecto
        paciente: {
          create: {} // Crea el registro en la tabla Paciente vacío, asociado a este usuario
        }
      }
    });

    res.status(201).json({ 
      ok: true, 
      message: 'Usuario registrado exitosamente como paciente',
      data: { id: nuevoUsuario.idUsuario, email: nuevoUsuario.email }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};
const login = async (req, res) => {
  try {
    const { email, contrasena } = req.body;

    // 1. Buscamos si el usuario existe
    const usuario = await prisma.usuario.findUnique({
      where: { email }
    });

    if (!usuario) {
      return res.status(401).json({ ok: false, message: 'Credenciales inválidas' });
    }

    // 2. Comparamos la contraseña encriptada
    const passwordValida = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!passwordValida) {
      return res.status(401).json({ ok: false, message: 'Credenciales inválidas' });
    }

    // 2.1 Bloqueamos el acceso si la cuenta fue desactivada por un administrador
    if (!usuario.activo) {
      return res.status(403).json({ ok: false, message: 'Tu cuenta está desactivada. Contactá a un administrador.' });
    }

    // 3. Generamos el Token JWT (usando la clave secreta de tu .env)
    const token = jwt.sign(
      { 
        id: usuario.idUsuario, 
        email: usuario.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '2h' } // El token durará 2 horas
    );

    res.json({ 
      ok: true, 
      message: 'Inicio de sesión exitoso',
      token 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};
const obtenerPerfil = async (req, res) => {
  try {
    // Si llegamos hasta acá, es porque el middleware (verificarToken) nos dejó pasar
    res.json({
      ok: true,
      message: '¡Pasaste la seguridad! Este es un endpoint privado.',
      datosDelToken: req.usuario
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

// Acordate de agregarlo a la exportación final
module.exports = {
  register,
  login,
  obtenerPerfil
};