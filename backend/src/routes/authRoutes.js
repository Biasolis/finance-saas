const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// Rotas Públicas
router.post('/register', authController.registerTenant);
router.post('/login', authController.login);

// Rotas Protegidas (Exemplo de uso do middleware)
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;