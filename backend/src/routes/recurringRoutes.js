const express = require('express');
const router = express.Router();
const recurringController = require('../controllers/recurringController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', recurringController.listRecurring);
router.post('/', recurringController.createRecurring);
router.post('/process', recurringController.processDueTransactions); // Botão "Verificar Agora"
router.delete('/:id', recurringController.deleteRecurring);

module.exports = router;