const { query } = require('../config/db');
const { hashPassword } = require('../utils/security');

// ==========================================
// 1. OBTER DADOS DA EMPRESA E USUÁRIOS
// ==========================================
const getSettings = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        const tenantResult = await query(
            'SELECT name, slug, closing_day, plan_tier, max_users, active FROM tenants WHERE id = $1',
            [tenantId]
        );

        const usersResult = await query(
            'SELECT id, name, email, role, is_super_admin, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at DESC',
            [tenantId]
        );

        return res.json({
            tenant: tenantResult.rows[0],
            users: usersResult.rows
        });

    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        return res.status(500).json({ message: 'Erro ao carregar dados.' });
    }
};

// ==========================================
// 2. ATUALIZAR DADOS DA EMPRESA
// ==========================================
const updateTenant = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { name, closing_day } = req.body;

        if (!name || !closing_day) {
            return res.status(400).json({ message: 'Nome e dia de fechamento são obrigatórios.' });
        }

        await query(
            'UPDATE tenants SET name = $1, closing_day = $2 WHERE id = $3',
            [name, closing_day, tenantId]
        );

        return res.json({ message: 'Configurações atualizadas com sucesso!' });

    } catch (error) {
        console.error('Erro ao atualizar empresa:', error);
        return res.status(500).json({ message: 'Erro ao salvar alterações.' });
    }
};

// ==========================================
// 3. CRIAR NOVO USUÁRIO (COM TRAVA DE PLANO)
// ==========================================
const createUser = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
        }

        // 1. VERIFICAR TRAVA DE USUÁRIOS (NOVO)
        const tenantCheck = await query('SELECT max_users FROM tenants WHERE id = $1', [tenantId]);
        const maxUsers = tenantCheck.rows[0].max_users;

        const countCheck = await query('SELECT COUNT(*) FROM users WHERE tenant_id = $1', [tenantId]);
        const currentUsers = parseInt(countCheck.rows[0].count);

        if (currentUsers >= maxUsers) {
            return res.status(403).json({ 
                message: `Limite de usuários atingido (${maxUsers}). Faça um upgrade no plano.` 
            });
        }

        // 2. Verifica se email já existe
        const check = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            return res.status(400).json({ message: 'Este email já está em uso.' });
        }

        const hashedPassword = await hashPassword(password);

        const result = await query(
            `INSERT INTO users (tenant_id, name, email, password_hash, role) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, name, email, role`,
            [tenantId, name, email, hashedPassword, role || 'user']
        );

        return res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        return res.status(500).json({ message: 'Erro ao adicionar usuário.' });
    }
};

// ==========================================
// 4. REMOVER USUÁRIO
// ==========================================
const deleteUser = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;

        if (req.user.id === parseInt(id)) {
            return res.status(400).json({ message: 'Você não pode excluir sua própria conta.' });
        }

        await query('DELETE FROM users WHERE id = $1 AND tenant_id = $2', [id, tenantId]);

        return res.json({ message: 'Usuário removido com sucesso.' });

    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        return res.status(500).json({ message: 'Erro ao remover usuário.' });
    }
};

module.exports = {
    getSettings,
    updateTenant,
    createUser,
    deleteUser
};