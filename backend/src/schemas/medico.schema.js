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
  // Valor corto (ej: "A", "12", "204"): la palabra "Consultorio" la agrega
  // siempre la UI al mostrarlo, nunca se guarda como parte del dato.
  consultorio: z.preprocess(
    (valor) => (valor === '' || valor == null ? undefined : valor),
    z.string()
      .trim()
      .regex(/^[A-Za-z0-9]{1,10}$/, 'El consultorio debe ser un valor corto, ej: "A" o "204" (sin la palabra "Consultorio")')
      .optional()
  ),
  especialidadesIds: z
    .array(z.number().int().positive())
    .min(1, 'Debe indicar al menos una especialidad'),
  // Cuánto dura cada turno de este médico. Opcional: si no se manda, Prisma
  // usa el default de 30 minutos.
  duracionTurnoMinutos: z.preprocess(
    (valor) => (valor === '' || valor == null ? undefined : Number(valor)),
    z.number().int().min(5, 'La duración mínima es 5 minutos').max(240, 'La duración máxima es 240 minutos').optional()
  ),
});

const cambiarEstadoMedicoSchema = z.object({
  activo: z.boolean(),
});

const actualizarMedicoSchema = z.object({
  consultorio: z.preprocess(
    (valor) => (valor === '' || valor == null ? undefined : valor),
    z.string()
      .trim()
      .regex(/^[A-Za-z0-9]{1,10}$/, 'El consultorio debe ser un valor corto, ej: "A" o "204" (sin la palabra "Consultorio")')
      .optional()
  ),
  duracionTurnoMinutos: z.preprocess(
    (valor) => (valor === '' || valor == null ? undefined : Number(valor)),
    z.number().int().min(5, 'La duración mínima es 5 minutos').max(240, 'La duración máxima es 240 minutos').optional()
  ),
  // Reemplaza la lista completa de especialidades del médico (no es un
  // "agregar", es un set) — si se manda, tiene que quedar al menos una.
  especialidadesIds: z
    .array(z.number().int().positive())
    .min(1, 'Debe indicar al menos una especialidad')
    .optional(),
});

module.exports = { crearMedicoSchema, cambiarEstadoMedicoSchema, actualizarMedicoSchema };
