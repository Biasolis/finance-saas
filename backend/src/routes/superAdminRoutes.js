const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const planController = require('../controllers/planController'); // <--- IMPORT NOVO
const authMiddleware = require('../middlewares/authMiddleware');
const superAdminMiddleware = require('../middlewares/superAdminMiddleware');

// Proteção Dupla: Deve estar logado E ser Super Admin
router.use(authMiddleware);
router.use(superAdminMiddleware);

// Dashboard
router.get('/stats', superAdminController.getGlobalStats);

// Gerenciamento de Tenants
router.get('/tenants', superAdminController.listAllTenants);
router.post('/tenants', superAdminController.createTenant);
router.delete('/tenants/:tenantId', superAdminController.deleteTenant);

// Ações no Tenant
router.post('/tenants/:tenantId/impersonate', superAdminController.impersonateTenant);
router.put('/tenants/:tenantId/plan', superAdminController.updateTenantPlan);

// Gestão de Super Admins
router.get('/admins', superAdminController.listSuperAdmins);
router.post('/admins', superAdminController.addSuperAdmin);
router.delete('/admins/:userId', superAdminController.removeSuperAdmin);

// GESTÃO DE PLANOS (NOVAS ROTAS)
router.get('/plans', planController.listPlans);
router.post('/plans', planController.createPlan);
router.put('/plans/:id', planController.updatePlan);
router.delete('/plans/:id', planController.deletePlan);

module.exports = router;