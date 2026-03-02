const express = require('express');
const router = express.Router();
const serviceOrderController = require('../controllers/serviceOrderController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', serviceOrderController.listServiceOrders);
router.post('/', serviceOrderController.createServiceOrder);
router.patch('/:id/status', serviceOrderController.updateServiceOrderStatus);
router.post('/:id/bill', serviceOrderController.finishAndBillOrder); // <--- NOVA ROTA DE FATURAMENTO
router.delete('/:id', serviceOrderController.deleteServiceOrder);

module.exports = router;