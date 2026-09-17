const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

// Hash "señuelo" contra el que comparar cuando el email no existe, para que
// bcrypt.compare tarde lo mismo en ambos casos (ver login más abajo).
const HASH_SENUELO = bcrypt.hashSync('salux-timing-guard', 12);

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REFRESH_COOKIE_NAME = 'refreshToken';

function derivarRol(usuario) {
  return usuario.admin ? 'admin' : usuario.medico ? 'medico' : 'paciente';
}

// Arma el objeto de perfil que se muestra/edita en la Vista de Perfil —
// incluye los campos propios de cada rol además de los comunes a Usuario.
function serializarPerfil(usuario, rol) {
  const perfil = {
    id: usuario.idUsuario,
    email: usuario.email,
    nombre: usuario.nomYape,
    dni: usuario.dni,
    rol,
  };

  if (rol === 'paciente' && usuario.paciente) {
    perfil.obraSocial = usuario.paciente.obraSocial || '';
    perfil.telefono = usuario.paciente.telefono || '';
  }

  if (rol === 'medico' && usuario.medico) {
    perfil.matricula = usuario.medico.matricula;
    perfil.consultorio = usuario.medico.consultorio || '';
  }

  return perfil;
}

// Arma el Access Token (corta duración, va en el body de la respuesta) y el
// Refresh Token (larga duración, va SOLO en una cookie httpOnly) para un
// usuario ya autenticado.
function generarTokens(usuario, rol) {
  const accessToken = jwt.sign(
    { id: usuario.idUsuario, email: usuario.email, rol },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );

  const refreshToken = jwt.sign(
    { id: usuario.idUsuario },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );

  return { accessToken, refreshToken };
}

// El Refresh Token viaja en una cookie httpOnly (inaccesible desde JS, evita
// robo por XSS) y con scope acotado a /api/auth (solo la necesitan refresh/logout).
function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

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
      return res.status(409).json({ ok: false, message: 'El email o DNI ya está registrado' });
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
    // Carrera entre dos registros simultáneos con el mismo email/dni
    if (error.code === 'P2002') {
      return res.status(409).json({ ok: false, message: 'El email o DNI ya está registrado' });
    }
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};
const login = async (req, res) => {
  try {
    const { email, contrasena } = req.body;

    // 1. Buscamos si el usuario existe, junto con sus perfiles para saber el rol
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { paciente: true, medico: true, admin: true }
    });

    // 2. Comparamos la contraseña encriptada. Corremos bcrypt.compare SIEMPRE
    // (incluso si el usuario no existe, contra un hash "señuelo") para que el
    // tiempo de respuesta no delate si un email está registrado o no.
    const passwordValida = await bcrypt.compare(contrasena, usuario?.contrasena || HASH_SENUELO);
    if (!usuario || !passwordValida) {
      return res.status(401).json({ ok: false, message: 'Credenciales inválidas' });
    }

    // 2.1 Bloqueamos el acceso si la cuenta fue desactivada por un administrador
    if (!usuario.activo) {
      return res.status(403).json({ ok: false, message: 'Tu cuenta está desactivada. Contactá a un administrador.' });
    }

    const rol = derivarRol(usuario);
    const { accessToken, refreshToken } = generarTokens(usuario, rol);
    setRefreshCookie(res, refreshToken);

    res.json({
      ok: true,
      message: 'Inicio de sesión exitoso',
      token: accessToken,
      usuario: { id: usuario.idUsuario, email: usuario.email, nombre: usuario.nomYape, rol }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

// Renueva el Access Token usando el Refresh Token de la cookie httpOnly.
// El frontend guarda el Access Token solo en memoria (nunca en localStorage),
// así que necesita poder pedir uno nuevo cada vez que recarga la página o
// cuando el actual vence (15 min).
const refresh = async (req, res) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ ok: false, message: 'No hay una sesión para renovar' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
      return res.status(401).json({ ok: false, message: 'La sesión venció, iniciá sesión de nuevo' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { idUsuario: payload.id },
      include: { paciente: true, medico: true, admin: true }
    });

    if (!usuario || !usuario.activo) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
      return res.status(401).json({ ok: false, message: 'Sesión inválida' });
    }

    const rol = derivarRol(usuario);
    // Rotamos también el refresh token en cada renovación (mejor práctica:
    // limita la ventana útil de un refresh token robado).
    const { accessToken, refreshToken } = generarTokens(usuario, rol);
    setRefreshCookie(res, refreshToken);

    res.json({
      ok: true,
      token: accessToken,
      usuario: { id: usuario.idUsuario, email: usuario.email, nombre: usuario.nomYape, rol }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

// Invalida la cookie del Refresh Token. El Access Token en memoria lo
// descarta el propio cliente (no hay nada que hacer server-side con él,
// ya que expira solo a los 15 min).
const logout = (req, res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  res.json({ ok: true, message: 'Sesión cerrada' });
};

const obtenerPerfil = async (req, res) => {
  try {
    // Si llegamos hasta acá, es porque el middleware (verificarToken) nos dejó pasar
    const usuario = await prisma.usuario.findUnique({
      where: { idUsuario: req.usuario.id },
      include: { paciente: true, medico: true, admin: true }
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ ok: false, message: 'Usuario no válido' });
    }

    const rol = derivarRol(usuario);

    res.json({
      ok: true,
      usuario: serializarPerfil(usuario, rol)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

// Actualiza los datos personales comunes a cualquier rol (por ahora, el
// nombre). Los campos propios de un rol —obraSocial/telefono de un
// paciente— se editan en su propio endpoint (ver paciente.controller.js).
const actualizarPerfil = async (req, res) => {
  try {
    const { nomYape } = req.body;

    const usuario = await prisma.usuario.update({
      where: { idUsuario: req.usuario.id },
      data: { nomYape },
      include: { paciente: true, medico: true, admin: true }
    });

    res.json({
      ok: true,
      message: 'Perfil actualizado con éxito',
      usuario: serializarPerfil(usuario, req.usuario.rol)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

const cambiarContrasena = async (req, res) => {
  try {
    const { contrasenaActual, contrasenaNueva } = req.body;

    const usuario = await prisma.usuario.findUnique({ where: { idUsuario: req.usuario.id } });
    if (!usuario) {
      return res.status(401).json({ ok: false, message: 'Usuario no válido' });
    }

    const passwordValida = await bcrypt.compare(contrasenaActual, usuario.contrasena);
    if (!passwordValida) {
      return res.status(401).json({ ok: false, message: 'La contraseña actual es incorrecta' });
    }

    const hashNuevo = await bcrypt.hash(contrasenaNueva, 12);
    await prisma.usuario.update({
      where: { idUsuario: usuario.idUsuario },
      data: { contrasena: hashNuevo }
    });

    res.json({ ok: true, message: 'Contraseña actualizada con éxito' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  obtenerPerfil,
  actualizarPerfil,
  cambiarContrasena
};
