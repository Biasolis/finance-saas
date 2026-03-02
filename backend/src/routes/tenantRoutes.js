const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/settings', tenantController.getSettings);
router.put('/settings', tenantController.updateTenant);
router.post('/users', tenantController.createUser);
router.delete('/users/:id', tenantController.deleteUser);

module.exports = router;