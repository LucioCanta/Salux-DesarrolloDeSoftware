const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const verificarToken = (req, res, next) => {
  // 1. Buscamos el token en la cabecera de la petición
  const authHeader = req.headers['authorization'];
  
  // El estándar es mandarlo como "Bearer eyJhbGciOi..."
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) {
    return res.status(403).json({ ok: false, message: 'Acceso denegado: Se requiere un token' });
  }

  // 2. Verificamos que el token sea auténtico y no haya expirado
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ ok: false, message: 'Token inválido o expirado' });
    }

    try {
      // 3. Re-chequeamos en la base que la cuenta siga activa: un JWT firmado
      // antes de que un admin desactive la cuenta seguiría siendo válido
      // hasta su vencimiento (2h) si no volvemos a mirar la base acá.
      const usuario = await prisma.usuario.findUnique({
        where: { idUsuario: decoded.id },
        select: { activo: true }
      });

      if (!usuario || !usuario.activo) {
        return res.status(403).json({ ok: false, message: 'Tu cuenta está desactivada. Contactá a un administrador.' });
      }

      // 4. Si está todo bien, guardamos los datos del usuario en la request
      req.usuario = decoded;

      // 5. Le decimos a Express que deje pasar la petición al controlador
      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ ok: false, error: 'Error interno al verificar la sesión' });
    }
  });
};
const verificarAdmin = async (req, res, next) => {
  try {
    // Como este control se ejecuta DESPUÉS de verificarToken, ya sabemos quién es el usuario
    const usuarioId = req.usuario.id;

    // Vamos a buscar si este ID existe en la tabla exclusiva de Administradores
    const admin = await prisma.administrador.findUnique({
      where: { usuarioId: usuarioId }
    });

    // Si Prisma nos devuelve null, significa que es un paciente o un médico, pero NO un admin.
    if (!admin) {
      return res.status(403).json({ 
        ok: false, 
        message: 'Acceso denegado: Acción exclusiva para Administradores de Salux' 
      });
    }

    // Si llegó hasta acá, es porque es Admin. Le abrimos la puerta con next()
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno al verificar roles' });
  }
};

// Actualizá la exportación al final del archivo para incluir a los dos
module.exports = {
  verificarToken,
  verificarAdmin
};