const { query } = require('../config/db');

const logAction = async (tenantId, userId, action, entity, entityId, details) => {
    try {
        // Grava no banco de forma assíncrona (não bloqueia o usuário)
        await query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity, entity_id, details) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [tenantId, userId, action, entity, entityId, details]
        );
    } catch (error) {
        console.error("Falha ao gravar auditoria:", error);
    }
};

module.exports = { logAction };