const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Relatórios Matemáticos
router.get('/financials', reportController.getMonthlyStatement);
router.get('/categories', reportController.getCategoryBreakdown);
router.get('/extract', reportController.getFinancialExtract); // <--- NOVA ROTA

// Relatório IA
router.get('/ai-analysis', transactionController.getAiReport);

module.exports = router;