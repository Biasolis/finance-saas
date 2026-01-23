const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;

/**
 * Cria o hash da senha
 */
const hashPassword = async (password) => {
    return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compara senha enviada com o hash do banco
 */
const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

/**
 * Gera o Token JWT contendo ID do usuário e ID do Tenant
 * Isso é crucial para o isolamento dos dados
 */
const generateToken = (user) => {
    return jwt.sign(
        { 
            userId: user.id, 
            tenantId: user.tenant_id,
            role: user.role,
            isSuperAdmin: user.is_super_admin 
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );
};

module.exports = {
    hashPassword,
    comparePassword,
    generateToken
};