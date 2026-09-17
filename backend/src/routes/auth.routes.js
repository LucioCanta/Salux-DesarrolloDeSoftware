const express = require('express');
const router = express.Router();

// 1. Importamos el controlador y el middleware (el "patovica")
const authController = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { registerSchema, loginSchema } = require('../schemas/auth.schema');

// 2. Rutas Públicas (No necesitan token)
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// 3. Rutas Privadas (Pasan por verificarToken antes de llegar al controlador)
router.get('/perfil', verificarToken, authController.obtenerPerfil);

// 4. Exportamos el router para que app.js lo pueda usar
module.exports = router;