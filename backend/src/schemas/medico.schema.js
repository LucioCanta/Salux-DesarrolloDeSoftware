const { z } = require('zod');

const crearMedicoSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
  dni: z
    .string()
    .trim()
    .regex(/^\d{7,9}$/, 'El DNI debe tener entre 7 y 9 dígitos'),
  contrasena: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  nomYape: z.string().trim().min(1, 'El nombre es obligatorio'),
  matricula: z.string().trim().min(1, 'La matrícula es obligatoria'),
  consultorio: z.string().trim().optional(),
  especialidadesIds: z
    .array(z.number().int().positive())
    .min(1, 'Debe indicar al menos una especialidad'),
});

module.exports = { crearMedicoSchema };
