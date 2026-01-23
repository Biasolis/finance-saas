const { query } = require('../config/db');
const { generateToken } = require('../utils/security');

// 1. LISTAR TODAS AS EMPRESAS (TENANTS)
const listAllTenants = async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                t.*,
                (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as user_count,
                (SELECT COUNT(*) FROM transactions tr WHERE tr.tenant_id = t.id) as transaction_count
            FROM tenants t
            ORDER BY t.created_at DESC
        `);
        return res.json(result.rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao listar empresas' });
    }
};

// 2. ACESSAR PAINEL DO CLIENTE (IMPERSONATION)
// Gera um token válido para o admin daquela empresa específica
const impersonateTenant = async (req, res) => {
    try {
        const { tenantId } = req.params;
        
        // Busca o primeiro admin dessa empresa para "encarnar"
        const userResult = await query(
            `SELECT * FROM users WHERE tenant_id = $1 AND role = 'admin' LIMIT 1`,
            [tenantId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Empresa não tem usuários admin.' });
        }

        const targetUser = userResult.rows[0];
        
        // Gera token como se fosse ele
        const token = generateToken(targetUser);

        return res.json({
            token,
            user: {
                id: targetUser.id,
                name: targetUser.name,
                email: targetUser.email,
                role: targetUser.role,
                tenantId: targetUser.tenant_id,
                // Importante: frontend saber que é impersonation para mostrar aviso
                isImpersonating: true 
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao acessar tenant.' });
    }
};

// 3. ATUALIZAR PLANO / LIMITES
const updateTenantPlan = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { plan_tier, ai_usage_limit, active } = req.body;

        await query(
            `UPDATE tenants 
             SET plan_tier = $1, ai_usage_limit = $2, active = $3, updated_at = NOW() 
             WHERE id = $4`,
            [plan_tier, ai_usage_limit, active, tenantId]
        );

        return res.json({ message: 'Plano atualizado com sucesso' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao atualizar plano.' });
    }
};

module.exports = {
    listAllTenants,
    impersonateTenant,
    updateTenantPlan
};