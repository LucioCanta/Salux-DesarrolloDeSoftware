const express = require('express');
const router = express.Router();

const disponibilidadController = require('../controllers/disponibilidad.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { crearDisponibilidadSchema } = require('../schemas/disponibilidad.schema');

// Rutas del médico logueado sobre sus propias franjas horarias
router.post('/', verificarToken, validate(crearDisponibilidadSchema), disponibilidadController.crearDisponibilidad);
router.get('/mias', verificarToken, disponibilidadController.obtenerMisDisponibilidades);
router.delete('/:id', verificarToken, disponibilidadController.eliminarDisponibilidad);

// Para el wizard de turnos del paciente: disponibilidad de un médico puntual
router.get('/medico/:medicoId', verificarToken, disponibilidadController.obtenerDisponibilidadDeMedico);

module.exports = router;
