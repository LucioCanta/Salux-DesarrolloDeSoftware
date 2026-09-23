const { z } = require('zod');

const crearTurnoSchema = z.object({
  medicoId: z.number().int().positive('medicoId inválido'),
  fechaYhora: z
    .string()
    .datetime({ message: 'fechaYhora debe ser una fecha ISO válida' })
    .refine((valor) => new Date(valor).getTime() > Date.now(), {
      message: 'El turno debe ser en una fecha futura',
    }),
});

const actualizarEstadoTurnoSchema = z.object({
  estado: z.enum(['PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'FINALIZADO'], {
    errorMap: () => ({ message: 'Estado no válido' }),
  }),
});

const reprogramarTurnoSchema = z.object({
  fechaYhora: z
    .string()
    .datetime({ message: 'fechaYhora debe ser una fecha ISO válida' })
    .refine((valor) => new Date(valor).getTime() > Date.now(), {
      message: 'El turno debe ser en una fecha futura',
    }),
});

module.exports = { crearTurnoSchema, actualizarEstadoTurnoSchema, reprogramarTurnoSchema };
