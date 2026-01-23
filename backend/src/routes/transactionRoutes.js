const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middlewares/authMiddleware');

// TODAS as rotas aqui são protegidas
router.use(authMiddleware);

// Rotas CRUD
router.get('/', transactionController.listTransactions);
router.post('/', transactionController.createTransaction);

// Rotas Dashboard & IA
router.get('/dashboard', transactionController.getDashboardSummary);
router.get('/chart-data', transactionController.getChartData);
router.get('/ai-analysis', transactionController.getAiReport);

module.exports = router;