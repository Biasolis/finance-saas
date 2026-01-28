const { query } = require('../config/db');

const getGeneralStats = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        // 1. Financeiro (Saldo do Mês)
        const financeResult = await query(`
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'income' AND status = 'completed' THEN amount ELSE 0 END), 0) as income,
                COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'completed' THEN amount ELSE 0 END), 0) as expense
            FROM transactions
            WHERE tenant_id = $1 AND date >= date_trunc('month', CURRENT_DATE)
        `, [tenantId]);

        // 2. Operacional (OS Abertas/Críticas)
        const osResult = await query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'open' OR status = 'in_progress') as open_os,
                COUNT(*) FILTER (WHERE priority = 'high' AND status != 'completed') as critical_os
            FROM service_orders
            WHERE tenant_id = $1
        `, [tenantId]);

        // 3. Estoque (Produtos com estoque baixo)
        const stockResult = await query(`
            SELECT COUNT(*) as low_stock_count
            FROM products
            WHERE tenant_id = $1 AND stock <= min_stock
        `, [tenantId]);

        // 4. Clientes (Total)
        const clientResult = await query(`
            SELECT COUNT(*) as total_clients FROM clients WHERE tenant_id = $1
        `, [tenantId]);

        return res.json({
            finance: {
                income: parseFloat(financeResult.rows[0].income),
                expense: parseFloat(financeResult.rows[0].expense),
                balance: parseFloat(financeResult.rows[0].income) - parseFloat(financeResult.rows[0].expense)
            },
            os: {
                open: parseInt(osResult.rows[0].open_os),
                critical: parseInt(osResult.rows[0].critical_os)
            },
            stock: {
                low: parseInt(stockResult.rows[0].low_stock_count)
            },
            clients: {
                total: parseInt(clientResult.rows[0].total_clients)
            }
        });

    } catch (error) {
        console.error('Erro dashboard geral:', error);
        return res.status(500).json({ message: 'Erro ao carregar estatísticas.' });
    }
};

module.exports = {
    getGeneralStats
};