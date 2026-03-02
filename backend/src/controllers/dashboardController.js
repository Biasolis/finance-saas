const { query } = require('../config/db');

const getGeneralStats = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { startDate, endDate, category_id } = req.query;

        // 1. Financeiro (Filtrável)
        let financeQuery = `
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'income' AND status = 'completed' THEN amount ELSE 0 END), 0) as income,
                COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'completed' THEN amount ELSE 0 END), 0) as expense
            FROM transactions
            WHERE tenant_id = $1
        `;
        let fParams = [tenantId];
        let fIdx = 2;

        if (startDate && endDate) {
            financeQuery += ` AND date BETWEEN $${fIdx} AND $${fIdx + 1}`;
            fParams.push(startDate, endDate);
            fIdx += 2;
        } else {
            financeQuery += ` AND date >= date_trunc('month', CURRENT_DATE)`;
        }

        if (category_id && category_id !== 'all') {
            financeQuery += ` AND category_id = $${fIdx}`;
            fParams.push(category_id);
        }

        const financeResult = await query(financeQuery, fParams);

        // 2. Operacional (OS Abertas/Críticas - Mantém geral da operação do tenant)
        const osResult = await query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'open' OR status = 'in_progress') as open_os,
                COUNT(*) FILTER (WHERE priority = 'high' AND status != 'completed') as critical_os
            FROM service_orders WHERE tenant_id = $1
        `, [tenantId]);

        // 3. Estoque
        const stockResult = await query(`
            SELECT COUNT(*) as low_stock_count FROM products WHERE tenant_id = $1 AND stock <= min_stock
        `, [tenantId]);

        // 4. Clientes
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
            stock: { low: parseInt(stockResult.rows[0].low_stock_count) },
            clients: { total: parseInt(clientResult.rows[0].total_clients) }
        });

    } catch (error) {
        console.error('Erro dashboard geral:', error);
        return res.status(500).json({ message: 'Erro ao carregar estatísticas.' });
    }
};

module.exports = {
    getGeneralStats
};