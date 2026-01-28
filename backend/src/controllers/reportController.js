const { query } = require('../config/db');

// ==========================================
// 1. DRE MENSAL (Demonstrativo do Resultado)
// ==========================================
const getMonthlyStatement = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { year } = req.query;
        const selectedYear = year || new Date().getFullYear();

        const sql = `
            SELECT 
                TO_CHAR(date, 'MM') as month,
                SUM(amount) FILTER (WHERE type = 'income' AND status = 'completed') as income,
                SUM(amount) FILTER (WHERE type = 'expense' AND status = 'completed') as expense
            FROM transactions
            WHERE tenant_id = $1 
              AND TO_CHAR(date, 'YYYY') = $2
            GROUP BY TO_CHAR(date, 'MM')
            ORDER BY month ASC
        `;

        const result = await query(sql, [tenantId, String(selectedYear)]);

        const completeData = Array.from({ length: 12 }, (_, i) => {
            const monthStr = String(i + 1).padStart(2, '0');
            const found = result.rows.find(r => r.month === monthStr);
            
            const income = parseFloat(found?.income || 0);
            const expense = parseFloat(found?.expense || 0);
            
            return {
                month: monthStr,
                monthLabel: new Date(2024, i, 1).toLocaleDateString('pt-BR', { month: 'long' }),
                income,
                expense,
                result: income - expense
            };
        });

        const totals = completeData.reduce((acc, curr) => ({
            income: acc.income + curr.income,
            expense: acc.expense + curr.expense,
            result: acc.result + curr.result
        }), { income: 0, expense: 0, result: 0 });

        return res.json({ year: selectedYear, monthly: completeData, totals });

    } catch (error) {
        console.error('Erro no DRE:', error);
        return res.status(500).json({ message: 'Erro ao gerar demonstrativo.' });
    }
};

// ==========================================
// 2. DETALHAMENTO POR CATEGORIA
// ==========================================
const getCategoryBreakdown = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { month, year, type } = req.query;
        
        const now = new Date();
        const qMonth = month || (now.getMonth() + 1);
        const qYear = year || now.getFullYear();
        const qType = type || 'expense';

        const sql = `
            SELECT c.name, SUM(t.amount) as total
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.tenant_id = $1 
              AND t.type = $2
              AND t.status = 'completed'
              AND EXTRACT(MONTH FROM t.date) = $3
              AND EXTRACT(YEAR FROM t.date) = $4
            GROUP BY c.name
            ORDER BY total DESC
        `;

        const result = await query(sql, [tenantId, qType, qMonth, qYear]);

        const formatted = result.rows.map(r => ({
            name: r.name || 'Sem Categoria',
            total: parseFloat(r.total)
        }));

        return res.json(formatted);

    } catch (error) {
        console.error('Erro detalhamento:', error);
        return res.status(500).json({ message: 'Erro ao buscar categorias.' });
    }
};

// ==========================================
// 3. EXTRATO DETALHADO (AUDITORIA) - NOVO
// ==========================================
const getFinancialExtract = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { startDate, endDate } = req.query;

        // Traz TUDO: Quem criou, Quem é o cliente, Datas, Categorias
        let sql = `
            SELECT 
                t.id, 
                t.date as competence_date, -- Data de Vencimento/Competência
                t.created_at as registration_date, -- Data de Cadastro
                t.description, 
                t.amount, 
                t.type, 
                t.status,
                c.name as category_name,
                cl.name as client_name,
                u.name as created_by_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN clients cl ON t.client_id = cl.id
            LEFT JOIN users u ON t.created_by = u.id
            WHERE t.tenant_id = $1
        `;

        const params = [tenantId];
        let paramIndex = 2;

        if (startDate && endDate) {
            sql += ` AND t.date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params.push(startDate, endDate);
            paramIndex += 2;
        }

        sql += ` ORDER BY t.date DESC, t.created_at DESC`;

        const result = await query(sql, params);

        return res.json(result.rows);

    } catch (error) {
        console.error('Erro no extrato:', error);
        return res.status(500).json({ message: 'Erro ao gerar extrato detalhado.' });
    }
};

module.exports = {
    getMonthlyStatement,
    getCategoryBreakdown,
    getFinancialExtract // Novo
};