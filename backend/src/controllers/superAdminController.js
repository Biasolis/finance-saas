const { query, pool } = require('../config/db');
const { generateToken, hashPassword } = require('../utils/security');

// ==========================================
// 1. ESTATÍSTICAS GLOBAIS
// ==========================================
const getGlobalStats = async (req, res) => {
    try {
        const tenants = await query('SELECT COUNT(*) FROM tenants');
        const activeTenants = await query('SELECT COUNT(*) FROM tenants WHERE active = true');
        const users = await query('SELECT COUNT(*) FROM users');
        const transactions = await query('SELECT COUNT(*) FROM transactions');

        return res.json({
            total_tenants: parseInt(tenants.rows[0].count),
            active_tenants: parseInt(activeTenants.rows[0].count),
            total_users: parseInt(users.rows[0].count),
            total_transactions: parseInt(transactions.rows[0].count)
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao carregar estatísticas globais' });
    }
};

// ==========================================
// 2. LISTAR TODAS AS EMPRESAS
// ==========================================
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

// ==========================================
// 3. CRIAR EMPRESA MANUALMENTE
// ==========================================
const createTenant = async (req, res) => {
    const client = await pool.connect();
    try {
        const { companyName, slug, name, email, password, plan_tier } = req.body;

        if (!companyName || !slug || !email || !password) {
            return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
        }

        await client.query('BEGIN');

        const slugCheck = await client.query('SELECT id FROM tenants WHERE slug = $1', [slug]);
        if (slugCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Slug já existe.' });
        }

        const tenantResult = await client.query(
            `INSERT INTO tenants (name, slug, plan_tier, active, max_users) 
             VALUES ($1, $2, $3, true, 5) 
             RETURNING id`,
            [companyName, slug, plan_tier || 'basic']
        );
        const newTenantId = tenantResult.rows[0].id;

        const hashedPassword = await hashPassword(password);
        await client.query(
            `INSERT INTO users (tenant_id, name, email, password_hash, role, is_super_admin) 
             VALUES ($1, $2, $3, $4, 'admin', false)`,
            [newTenantId, name, email, hashedPassword]
        );

        await client.query('COMMIT');
        return res.status(201).json({ message: 'Empresa criada com sucesso!' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ message: 'Erro ao criar empresa.' });
    } finally {
        client.release();
    }
};

// ==========================================
// 4. DELETAR EMPRESA
// ==========================================
const deleteTenant = async (req, res) => {
    try {
        const { tenantId } = req.params;
        await query('DELETE FROM tenants WHERE id = $1', [tenantId]);
        return res.json({ message: 'Empresa removida permanentemente.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao deletar empresa.' });
    }
};

// ==========================================
// 5. IMPERSONATION
// ==========================================
const impersonateTenant = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const userResult = await query(
            `SELECT * FROM users WHERE tenant_id = $1 AND role = 'admin' LIMIT 1`,
            [tenantId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Empresa não tem usuários admin.' });
        }

        const targetUser = userResult.rows[0];
        const token = generateToken(targetUser);

        return res.json({
            token,
            user: {
                id: targetUser.id,
                name: targetUser.name,
                email: targetUser.email,
                role: targetUser.role,
                tenantId: targetUser.tenant_id,
                isImpersonating: true 
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao acessar tenant.' });
    }
};

// ==========================================
// 6. ATUALIZAR PLANO E LIMITES (NOVO: max_users)
// ==========================================
const updateTenantPlan = async (req, res) => {
    try {
        const { tenantId } = req.params;
        // Recebe max_users do frontend
        const { plan_tier, ai_usage_limit, active, max_users } = req.body;

        await query(
            `UPDATE tenants 
             SET plan_tier = $1, ai_usage_limit = $2, active = $3, max_users = $4, updated_at = NOW() 
             WHERE id = $5`,
            [plan_tier, ai_usage_limit, active, max_users || 5, tenantId]
        );

        return res.json({ message: 'Plano e limites atualizados com sucesso' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao atualizar plano.' });
    }
};

// ==========================================
// 7. GESTÃO DE SUPER ADMINS (NOVO)
// ==========================================

// Listar Super Admins
const listSuperAdmins = async (req, res) => {
    try {
        const result = await query(`
            SELECT u.id, u.name, u.email, t.name as tenant_name 
            FROM users u
            JOIN tenants t ON u.tenant_id = t.id
            WHERE u.is_super_admin = true
        `);
        return res.json(result.rows);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao listar admins.' });
    }
};

// Adicionar Super Admin (Promover Usuário)
const addSuperAdmin = async (req, res) => {
    try {
        const { email } = req.body;
        
        // Verifica se usuário existe
        const check = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (check.rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });

        await query('UPDATE users SET is_super_admin = true WHERE email = $1', [email]);
        return res.json({ message: 'Privilégios de Super Admin concedidos.' });

    } catch (error) {
        return res.status(500).json({ message: 'Erro ao adicionar admin.' });
    }
};

// Remover Super Admin (Rebaixar)
const removeSuperAdmin = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Proteção: Não deixar remover a si mesmo se for o último (opcional, mas bom)
        // Aqui vamos simples: apenas remove a flag
        await query('UPDATE users SET is_super_admin = false WHERE id = $1', [userId]);
        
        return res.json({ message: 'Privilégios revogados.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao remover admin.' });
    }
};

module.exports = {
    getGlobalStats,
    listAllTenants,
    createTenant,
    deleteTenant,
    impersonateTenant,
    updateTenantPlan,
    listSuperAdmins, // Novo
    addSuperAdmin,   // Novo
    removeSuperAdmin // Novo
};