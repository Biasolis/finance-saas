const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', transactionController.listTransactions);
router.post('/', transactionController.createTransaction);
router.patch('/:id/status', transactionController.updateTransactionStatus);
router.delete('/:id', transactionController.deleteTransaction); // <--- ROTA NOVA

router.get('/dashboard', transactionController.getDashboardSummary);
router.get('/recent', transactionController.getRecentTransactions);
router.get('/categories', transactionController.getCategoryStats);
router.get('/chart-data', transactionController.getChartData);
router.get('/ai-analysis', transactionController.getAiReport);

module.exports = router;