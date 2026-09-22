const { z } = require('zod');

const crearDisponibilidadSchema = z
  .object({
    diaSemana: z.number().int().min(0, 'Día de la semana inválido').max(6, 'Día de la semana inválido'),
    horaInicioMinutos: z.number().int().min(0).max(1439),
    horaFinMinutos: z.number().int().min(0).max(1439),
  })
  .refine((datos) => datos.horaFinMinutos > datos.horaInicioMinutos, {
    message: 'La hora de fin debe ser posterior a la de inicio',
    path: ['horaFinMinutos'],
  });

module.exports = { crearDisponibilidadSchema };
