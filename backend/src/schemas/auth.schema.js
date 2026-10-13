const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
  dni: z
    .string()
    .trim()
    .regex(/^\d{7,9}$/, 'El DNI debe tener entre 7 y 9 dígitos'),
  contrasena: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  nomYape: z.string().trim().min(1, 'El nombre es obligatorio'),
});

const loginSchema = z.object({
  // Email o DNI (7 a 9 dígitos): el login acepta cualquiera de los dos.
  identificador: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (v) => /^\d{7,9}$/.test(v) || z.string().email().safeParse(v).success,
      'Ingresá un email o un DNI válido'
    ),
  contrasena: z.string().min(1, 'La contraseña es obligatoria'),
});

const actualizarPerfilSchema = z.object({
  nomYape: z.string().trim().min(1, 'El nombre es obligatorio').max(191),
});

const cambiarContrasenaSchema = z.object({
  contrasenaActual: z.string().min(1, 'Ingresá tu contraseña actual'),
  contrasenaNueva: z.string().min(8, 'La contraseña nueva debe tener al menos 8 caracteres'),
});

const olvideContrasenaSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
});

const resetearContrasenaSchema = z.object({
  token: z.string().min(1, 'Falta el token'),
  contrasenaNueva: z.string().min(8, 'La contraseña nueva debe tener al menos 8 caracteres'),
});

module.exports = {
  registerSchema,
  loginSchema,
  actualizarPerfilSchema,
  cambiarContrasenaSchema,
  olvideContrasenaSchema,
  resetearContrasenaSchema,
};
