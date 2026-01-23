const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const authMiddleware = require('../middlewares/authMiddleware');
const superAdminMiddleware = require('../middlewares/superAdminMiddleware');

// Proteção Dupla: Deve estar logado E ser Super Admin
router.use(authMiddleware);
router.use(superAdminMiddleware);

router.get('/tenants', superAdminController.listAllTenants);
router.post('/tenants/:tenantId/impersonate', superAdminController.impersonateTenant);
router.put('/tenants/:tenantId/plan', superAdminController.updateTenantPlan);

module.exports = router;