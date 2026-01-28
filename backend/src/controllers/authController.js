const { query } = require('../config/db');
const { hashPassword, comparePassword, generateToken } = require('../utils/security');
const { sendMail } = require('../config/mailer');
const crypto = require('crypto');
const logger = require('../config/logger'); // <--- IMPORT NOVO

// ==========================================
// 1. REGISTRO
// ==========================================
const register = async (req, res) => {
    try {
        const { companyName, slug, name, email, password } = req.body;

        if (!companyName || !slug || !email || !password) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
        }

        const slugCheck = await query('SELECT id FROM tenants WHERE slug = $1', [slug]);
        if (slugCheck.rows.length > 0) return res.status(400).json({ message: 'Slug já existe.' });

        const emailCheck = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (emailCheck.rows.length > 0) return res.status(400).json({ message: 'Email já cadastrado.' });

        const tenantResult = await query('INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id', [companyName, slug]);
        const tenantId = tenantResult.rows[0].id;

        const hashedPassword = await hashPassword(password);
        const userResult = await query(
            `INSERT INTO users (tenant_id, name, email, password_hash, role, is_super_admin) 
             VALUES ($1, $2, $3, $4, 'admin', false) 
             RETURNING id, name, email, role, tenant_id`,
            [tenantId, name, email, hashedPassword]
        );

        const user = userResult.rows[0];
        const token = generateToken(user);

        logger.info(`Nova empresa registrada: ${companyName} (${email})`); // <--- LOG

        return res.status(201).json({ message: 'Sucesso!', token, user });

    } catch (error) {
        logger.error(`Erro no registro: ${error.message}`); // <--- LOG ERRO
        return res.status(500).json({ message: 'Erro no registro.' });
    }
};

// ==========================================
// 2. LOGIN
// ==========================================
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await query(
            `SELECT u.*, t.name as company_name, t.slug as company_slug, t.active as tenant_active 
             FROM users u 
             JOIN tenants t ON u.tenant_id = t.id 
             WHERE u.email = $1`, 
            [email]
        );

        if (result.rows.length === 0) {
            logger.warn(`Tentativa de login falha (email não existe): ${email}`);
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const user = result.rows[0];
        if (!user.tenant_active) {
            logger.warn(`Login bloqueado (empresa inativa): ${email}`);
            return res.status(403).json({ message: 'Conta bloqueada.' });
        }

        const isMatch = await comparePassword(password, user.password_hash);
        if (!isMatch) {
            logger.warn(`Tentativa de login falha (senha incorreta): ${email}`);
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const token = generateToken(user);
        delete user.password_hash;

        logger.info(`Usuário logado: ${email}`);

        return res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                tenantId: user.tenant_id,
                companyName: user.company_name,
                avatar: user.avatar_path,
                isSuperAdmin: user.is_super_admin
            }
        });

    } catch (error) {
        logger.error(`Erro no login: ${error.message}`);
        return res.status(500).json({ message: 'Erro interno ao logar.' });
    }
};

// ==========================================
// 3. OBTER PERFIL
// ==========================================
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await query('SELECT id, name, email, role, avatar_path FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado' });
        return res.json(result.rows[0]);
    } catch (error) {
        logger.error(`Erro getProfile: ${error.message}`);
        return res.status(500).json({ message: 'Erro ao buscar perfil' });
    }
};

// ==========================================
// 4. ATUALIZAR PERFIL
// ==========================================
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email, currentPassword, newPassword, avatar_path } = req.body;

        const userCheck = await query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = userCheck.rows[0];

        const isMatch = await comparePassword(currentPassword, user.password_hash);
        if (!isMatch) {
            logger.warn(`Tentativa de update perfil senha incorreta: ${userId}`);
            return res.status(401).json({ message: 'Senha atual incorreta.' });
        }

        let passwordHash = user.password_hash;
        if (newPassword && newPassword.trim() !== '') {
            passwordHash = await hashPassword(newPassword);
        }

        const finalAvatar = avatar_path !== undefined ? avatar_path : user.avatar_path;

        await query(
            `UPDATE users SET name = $1, email = $2, password_hash = $3, avatar_path = $4 WHERE id = $5`,
            [name, email, passwordHash, finalAvatar, userId]
        );

        logger.info(`Perfil atualizado: ${userId}`);

        return res.json({ 
            message: 'Perfil atualizado!',
            user: { id: userId, name, email, avatar: finalAvatar }
        });

    } catch (error) {
        logger.error(`Erro updateProfile: ${error.message}`);
        return res.status(500).json({ message: 'Erro ao atualizar.' });
    }
};

// ==========================================
// 5. ESQUECI MINHA SENHA
// ==========================================
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const userCheck = await query('SELECT id, name FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length === 0) {
            return res.json({ message: 'Se o email existir, enviamos um link de recuperação.' });
        }

        const user = userCheck.rows[0];
        const token = crypto.randomBytes(20).toString('hex');
        const now = new Date();
        now.setHours(now.getHours() + 1);

        await query(
            'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
            [token, now, user.id]
        );

        const resetUrl = `http://localhost:5173/reset-password/${token}`;

        const html = `
            <h3>Olá, ${user.name}</h3>
            <p>Você solicitou a redefinição de senha.</p>
            <p>Clique no link abaixo para criar uma nova senha:</p>
            <a href="${resetUrl}" style="background:#2563eb;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Redefinir Senha</a>
            <p>O link expira em 1 hora.</p>
        `;

        await sendMail(email, 'Recuperação de Senha - Finance SaaS', html);
        
        logger.info(`Email recuperação enviado: ${email}`);

        return res.json({ message: 'Email de recuperação enviado.' });

    } catch (error) {
        logger.error(`Erro forgotPassword: ${error.message}`);
        return res.status(500).json({ message: 'Erro ao processar solicitação.' });
    }
};

// ==========================================
// 6. REDEFINIR SENHA
// ==========================================
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) return res.status(400).json({ message: 'Dados incompletos.' });

        const result = await query(
            `SELECT id FROM users 
             WHERE reset_token = $1 AND reset_expires > NOW()`,
            [token]
        );

        if (result.rows.length === 0) {
            logger.warn(`Tentativa reset senha token inválido`);
            return res.status(400).json({ message: 'Token inválido ou expirado.' });
        }

        const user = result.rows[0];
        const newHash = await hashPassword(newPassword);

        await query(
            `UPDATE users 
             SET password_hash = $1, reset_token = NULL, reset_expires = NULL 
             WHERE id = $2`,
            [newHash, user.id]
        );

        logger.info(`Senha redefinida com sucesso: ${user.id}`);

        return res.json({ message: 'Senha alterada com sucesso! Faça login.' });

    } catch (error) {
        logger.error(`Erro resetPassword: ${error.message}`);
        return res.status(500).json({ message: 'Erro ao redefinir senha.' });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    forgotPassword,
    resetPassword
};