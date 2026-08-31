const express = require('express');
const router = express.Router();

const medicoController = require('../controllers/medico.controller');
const { verificarToken, verificarAdmin } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { crearMedicoSchema } = require('../schemas/medico.schema');

// Ruta POST: /api/medicos
router.post('/', verificarToken, verificarAdmin, validate(crearMedicoSchema), medicoController.crearMedico);
// Ruta GET: /api/medicos (Para listar a todos los médicos de la cartilla)
router.get('/', verificarToken, medicoController.obtenerMedicos);
module.exports = router;