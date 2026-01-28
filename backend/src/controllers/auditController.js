const { query } = require('../config/db');

const listLogs = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        // Traz os logs com o nome do usuário que fez a ação
        const sql = `
            SELECT a.*, u.name as user_name 
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.tenant_id = $1
            ORDER BY a.created_at DESC
            LIMIT 100
        `;
        const result = await query(sql, [tenantId]);
        return res.json(result.rows);
    } catch (error) {
        console.error('Erro logs:', error);
        return res.status(500).json({ message: 'Erro ao buscar auditoria.' });
    }
};

module.exports = { listLogs };