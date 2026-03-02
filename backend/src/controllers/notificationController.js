const { query } = require('../config/db');

// Lista notificações e também GERA notificações automáticas na hora
const getNotifications = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        // 1. GERAÇÃO AUTOMÁTICA (Verifica problemas e cria notificação se não existir hoje)
        
        // A. Verifica Estoque Baixo
        const lowStock = await query(
            'SELECT COUNT(*) as count FROM products WHERE tenant_id = $1 AND stock <= min_stock', 
            [tenantId]
        );
        const stockCount = parseInt(lowStock.rows[0].count);
        
        if (stockCount > 0) {
            // Verifica se já avisamos hoje
            const check = await query(
                `SELECT id FROM notifications 
                 WHERE tenant_id = $1 AND title LIKE 'Alerta de Estoque%' 
                 AND created_at >= CURRENT_DATE`, 
                [tenantId]
            );
            
            if (check.rows.length === 0) {
                await query(
                    `INSERT INTO notifications (tenant_id, title, message, type) 
                     VALUES ($1, $2, $3, 'warning')`,
                    [tenantId, `Alerta de Estoque (${stockCount})`, `Você tem ${stockCount} produtos abaixo do mínimo.`]
                );
            }
        }

        // B. Verifica Contas a Pagar Vencendo Hoje
        const dueBills = await query(
            `SELECT COUNT(*) as count FROM transactions 
             WHERE tenant_id = $1 AND type = 'expense' AND status = 'pending' AND date <= CURRENT_DATE`,
            [tenantId]
        );
        const billsCount = parseInt(dueBills.rows[0].count);

        if (billsCount > 0) {
             const check = await query(
                `SELECT id FROM notifications 
                 WHERE tenant_id = $1 AND title LIKE 'Contas Vencendo%' 
                 AND created_at >= CURRENT_DATE`, 
                [tenantId]
            );
            if (check.rows.length === 0) {
                await query(
                    `INSERT INTO notifications (tenant_id, title, message, type) 
                     VALUES ($1, $2, $3, 'error')`,
                    [tenantId, `Contas Vencendo (${billsCount})`, `Existem ${billsCount} contas para pagar hoje ou atrasadas.`]
                );
            }
        }

        // 2. LISTAGEM FINAL
        const result = await query(
            'SELECT * FROM notifications WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 20',
            [tenantId]
        );

        return res.json(result.rows);

    } catch (error) {
        console.error('Erro notificações:', error);
        return res.status(500).json({ message: 'Erro ao carregar notificações.' });
    }
};

const markAsRead = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        await query('UPDATE notifications SET is_read = true WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ message: 'Erro.' });
    }
};

const markAllRead = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        await query('UPDATE notifications SET is_read = true WHERE tenant_id = $1', [tenantId]);
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ message: 'Erro.' });
    }
};

module.exports = { getNotifications, markAsRead, markAllRead };