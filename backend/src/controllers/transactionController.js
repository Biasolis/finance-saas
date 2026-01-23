const { query } = require('../config/db');
const geminiService = require('../services/geminiService');

// ==========================================
// 1. LISTAR TRANSAÇÕES (Com Paginação e Filtros)
// ==========================================
const listTransactions = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { page = 1, limit = 20, type, startDate, endDate } = req.query;
        const offset = (page - 1) * limit;

        // Construção dinâmica da query SQL baseada nos filtros
        let sql = `
            SELECT id, description, amount, type, cost_type, status, date, category_id 
            FROM transactions 
            WHERE tenant_id = $1
        `;
        const params = [tenantId];
        let paramIndex = 2;

        if (type) {
            sql += ` AND type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        if (startDate && endDate) {
            sql += ` AND date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params.push(startDate, endDate);
            paramIndex += 2;
        }

        sql += ` ORDER BY date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await query(sql, params);
        
        // Contagem total para paginação frontend
        const countResult = await query(`SELECT COUNT(*) FROM transactions WHERE tenant_id = $1`, [tenantId]);

        return res.json({
            data: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Erro ao listar transações:', error);
        return res.status(500).json({ message: 'Erro interno ao buscar dados.' });
    }
};

// ==========================================
// 2. CRIAR NOVA TRANSAÇÃO
// ==========================================
const createTransaction = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { description, amount, type, cost_type, date, status, use_ai_category } = req.body;

        if (!description || !amount || !type || !date) {
            return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
        }

        let categoryName = "Geral";

        // Integração com Gemini na criação (Opcional via checkbox no frontend)
        if (use_ai_category) {
            categoryName = await geminiService.categorizeTransaction(description);
        }

        // 1. Tenta achar ou criar a categoria (Gestão simples por string)
        let categoryId = null;
        const catCheck = await query(
            'SELECT id FROM categories WHERE tenant_id = $1 AND name = $2', 
            [tenantId, categoryName]
        );

        if (catCheck.rows.length > 0) {
            categoryId = catCheck.rows[0].id;
        } else {
            const newCat = await query(
                'INSERT INTO categories (tenant_id, name, type) VALUES ($1, $2, $3) RETURNING id',
                [tenantId, categoryName, type]
            );
            categoryId = newCat.rows[0].id;
        }

        // 2. Insere a transação
        const result = await query(
            `INSERT INTO transactions 
            (tenant_id, category_id, description, amount, type, cost_type, status, date, created_by) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING *`,
            [tenantId, categoryId, description, amount, type, cost_type || 'variable', status || 'completed', date, userId]
        );

        return res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao criar transação:', error);
        return res.status(500).json({ message: 'Erro ao salvar transação.' });
    }
};

// ==========================================
// 3. DASHBOARD KPI (Saldo, Entradas, Saídas)
// ==========================================
const getDashboardSummary = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        
        // Query de agregação única otimizada
        const sql = `
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
                COUNT(*) as total_transactions
            FROM transactions
            WHERE tenant_id = $1 AND date >= date_trunc('month', CURRENT_DATE)
        `;

        const result = await query(sql, [tenantId]);
        const data = result.rows[0];
        
        // Calculando saldo
        const balance = parseFloat(data.total_income) - parseFloat(data.total_expense);

        return res.json({
            period: 'current_month',
            income: parseFloat(data.total_income),
            expense: parseFloat(data.total_expense),
            balance: balance,
            transaction_count: parseInt(data.total_transactions)
        });

    } catch (error) {
        console.error('Erro no dashboard:', error);
        return res.status(500).json({ message: 'Erro ao gerar dashboard.' });
    }
};

// ==========================================
// 4. RELATÓRIO IA (Análise Textual)
// ==========================================
const getAiReport = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        
        // Busca as últimas 50 transações para análise
        const result = await query(
            `SELECT date, description, amount, type 
             FROM transactions 
             WHERE tenant_id = $1 
             ORDER BY date DESC LIMIT 50`,
            [tenantId]
        );

        if (result.rows.length === 0) {
            return res.json({ summary: "Sem dados suficientes para análise." });
        }

        const insight = await geminiService.generateFinancialInsight(result.rows, "Últimas 50 transações");
        
        return res.json(insight);

    } catch (error) {
        console.error('Erro no relatório IA:', error);
        return res.status(500).json({ message: 'Erro ao gerar relatório inteligente.' });
    }
};

// ==========================================
// 5. DADOS PARA O GRÁFICO (Série Temporal)
// ==========================================
const getChartData = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        
        // Agrupa entradas e saídas por dia nos últimos 30 dias
        const sql = `
            SELECT 
                TO_CHAR(date, 'DD/MM') as name,
                SUM(amount) FILTER (WHERE type = 'income') as income,
                SUM(amount) FILTER (WHERE type = 'expense') as expense
            FROM transactions
            WHERE tenant_id = $1 
              AND date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY TO_CHAR(date, 'DD/MM'), date
            ORDER BY date ASC
        `;

        const result = await query(sql, [tenantId]);
        
        const formatted = result.rows.map(row => ({
            name: row.name,
            income: parseFloat(row.income || 0),
            expense: parseFloat(row.expense || 0)
        }));

        return res.json(formatted);

    } catch (error) {
        console.error('Erro no gráfico:', error);
        return res.status(500).json({ message: 'Erro ao gerar dados do gráfico.' });
    }
};

module.exports = {
    listTransactions,
    createTransaction,
    getDashboardSummary,
    getAiReport,
    getChartData
};