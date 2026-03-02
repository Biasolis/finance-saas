const { query } = require('../config/db');
const geminiService = require('../services/geminiService');
const auditService = require('../services/auditService');

// ==========================================
// 1. LISTAR TRANSAÇÕES (Com Filtros, Paginação, Joins e Totais)
// ==========================================
const listTransactions = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { page = 1, limit = 20, type, status, startDate, endDate, category_id } = req.query;
        const offset = (page - 1) * limit;

        // Query principal com JOINS para trazer nomes de Categoria e Cliente
        let sql = `
            SELECT t.id, t.description, t.amount, t.type, t.cost_type, t.status, t.date, t.attachment_path,
                   c.name as category_name, cl.name as client_name, t.category_id
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN clients cl ON t.client_id = cl.id
            WHERE t.tenant_id = $1
        `;
        const params = [tenantId];
        let paramIndex = 2;

        // Filtros Dinâmicos
        if (type) {
            sql += ` AND t.type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        if (status && status !== 'all') {
            sql += ` AND t.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (category_id && category_id !== 'all') {
            sql += ` AND t.category_id = $${paramIndex}`;
            params.push(category_id);
            paramIndex++;
        }

        if (startDate && endDate) {
            sql += ` AND t.date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params.push(startDate, endDate);
            paramIndex += 2;
        }

        // Ordenação e Paginação
        sql += ` ORDER BY t.date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await query(sql, params);
        
        // Contagem para paginação
        let countSql = `SELECT COUNT(*) FROM transactions WHERE tenant_id = $1`;
        let countParams = [tenantId];
        let countIndex = 2;
        
        if (type) { countSql += ` AND type = $${countIndex}`; countParams.push(type); countIndex++; }
        if (status && status !== 'all') { countSql += ` AND status = $${countIndex}`; countParams.push(status); countIndex++; }
        if (category_id && category_id !== 'all') { countSql += ` AND category_id = $${countIndex}`; countParams.push(category_id); countIndex++; }
        if (startDate && endDate) { countSql += ` AND date BETWEEN $${countIndex} AND $${countIndex + 1}`; countParams.push(startDate, endDate); }

        const countResult = await query(countSql, countParams);

        // --- CÁLCULO DE TOTAIS (GERAL E MENSAL) BASEADO NOS FILTROS ---
        let totalsSql = `
            SELECT 
                COALESCE(SUM(amount) FILTER (WHERE type = 'income' AND status = 'completed'), 0) as total_income,
                COALESCE(SUM(amount) FILTER (WHERE type = 'expense' AND status = 'completed'), 0) as total_expense,
                COALESCE(SUM(amount) FILTER (WHERE type = 'income' AND status = 'completed' AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE)), 0) as monthly_income,
                COALESCE(SUM(amount) FILTER (WHERE type = 'expense' AND status = 'completed' AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE)), 0) as monthly_expense
            FROM transactions 
            WHERE tenant_id = $1
        `;
        let totalsParams = [tenantId];
        let tIndex = 2;
        
        if (type) { totalsSql += ` AND type = $${tIndex}`; totalsParams.push(type); tIndex++; }
        if (status && status !== 'all') { totalsSql += ` AND status = $${tIndex}`; totalsParams.push(status); tIndex++; }
        if (category_id && category_id !== 'all') { totalsSql += ` AND category_id = $${tIndex}`; totalsParams.push(category_id); tIndex++; }
        if (startDate && endDate) { totalsSql += ` AND date BETWEEN $${tIndex} AND $${tIndex + 1}`; totalsParams.push(startDate, endDate); }
        
        const totalsResult = await query(totalsSql, totalsParams);

        return res.json({
            data: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                page: parseInt(page),
                limit: parseInt(limit)
            },
            totals: totalsResult.rows[0] // Retorna os totais junto com a listagem
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
        const { 
            description, amount, type, cost_type, date, status, 
            use_ai_category, client_id, category_id, attachment_path 
        } = req.body;

        if (!description || !amount || !type || !date) {
            return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
        }

        let finalCategoryId = category_id || null;

        // Lógica de Categorização IA (Sobrescreve a manual se ativada)
        if (use_ai_category) {
            const categoryName = await geminiService.categorizeTransaction(description);
            
            const catCheck = await query(
                'SELECT id FROM categories WHERE tenant_id = $1 AND name = $2', 
                [tenantId, categoryName]
            );

            if (catCheck.rows.length > 0) {
                finalCategoryId = catCheck.rows[0].id;
            } else {
                const newCat = await query(
                    'INSERT INTO categories (tenant_id, name, type) VALUES ($1, $2, $3) RETURNING id',
                    [tenantId, categoryName, type]
                );
                finalCategoryId = newCat.rows[0].id;
            }
        }

        // Insere a Transação (incluindo anexo, cliente e categoria)
        const result = await query(
            `INSERT INTO transactions 
            (tenant_id, category_id, client_id, description, amount, type, cost_type, status, date, created_by, attachment_path) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
            RETURNING *`,
            [
                tenantId, 
                finalCategoryId, 
                client_id || null, 
                description, 
                amount, 
                type, 
                cost_type || 'variable', 
                status || 'completed', 
                date, 
                userId,
                attachment_path || null
            ]
        );

        // --- AUDITORIA ---
        await auditService.logAction(
            tenantId, 
            userId, 
            'CREATE', 
            'TRANSACTION', 
            result.rows[0].id, 
            `Criou transação: ${description} (R$ ${amount})`
        );

        return res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao criar transação:', error);
        return res.status(500).json({ message: 'Erro ao salvar transação.' });
    }
};

// ==========================================
// 3. ATUALIZAR STATUS (DAR BAIXA)
// ==========================================
const updateTransactionStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'completed'].includes(status)) {
             return res.status(400).json({ message: 'Status inválido.' });
        }

        const result = await query(
            `UPDATE transactions 
             SET status = $1 
             WHERE id = $2 AND tenant_id = $3 
             RETURNING *`,
            [status, id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Transação não encontrada.' });
        }

        // --- AUDITORIA ---
        await auditService.logAction(
            tenantId, 
            userId, 
            'UPDATE', 
            'TRANSACTION', 
            id, 
            `Alterou status para: ${status}`
        );

        return res.json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        return res.status(500).json({ message: 'Erro ao atualizar transação.' });
    }
};

// ==========================================
// 4. DELETAR TRANSAÇÃO
// ==========================================
const deleteTransaction = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { id } = req.params;

        // 1. Busca dados antes de deletar para registrar no log
        const check = await query(
            'SELECT description, amount FROM transactions WHERE id=$1 AND tenant_id=$2', 
            [id, tenantId]
        );
        
        if (check.rows.length === 0) {
            return res.status(404).json({ message: 'Transação não encontrada' });
        }
        
        const oldData = check.rows[0];

        // 2. Deleta
        await query('DELETE FROM transactions WHERE id = $1 AND tenant_id = $2', [id, tenantId]);

        // --- AUDITORIA ---
        await auditService.logAction(
            tenantId, 
            userId, 
            'DELETE', 
            'TRANSACTION', 
            id, 
            `Apagou transação: ${oldData.description} (R$ ${oldData.amount})`
        );

        return res.json({ message: 'Transação removida com sucesso.' });

    } catch (error) {
        console.error('Erro ao deletar transação:', error);
        return res.status(500).json({ message: 'Erro ao remover transação.' });
    }
};

// ==========================================
// 5. DASHBOARD KPI (Cards de Topo)
// ==========================================
const getDashboardSummary = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        
        const sql = `
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'income' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_income,
                COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_expense,
                COALESCE(SUM(CASE WHEN type = 'income' AND status = 'pending' THEN amount ELSE 0 END), 0) as pending_income,
                COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'pending' THEN amount ELSE 0 END), 0) as pending_expense,
                COUNT(*) as total_transactions
            FROM transactions
            WHERE tenant_id = $1 AND date >= date_trunc('month', CURRENT_DATE)
        `;

        const result = await query(sql, [tenantId]);
        const data = result.rows[0];
        
        const balance = parseFloat(data.total_income) - parseFloat(data.total_expense);

        return res.json({
            period: 'current_month',
            income: parseFloat(data.total_income),
            expense: parseFloat(data.total_expense),
            balance: balance,
            pending_income: parseFloat(data.pending_income),
            pending_expense: parseFloat(data.pending_expense),
            transaction_count: parseInt(data.total_transactions)
        });

    } catch (error) {
        console.error('Erro no dashboard:', error);
        return res.status(500).json({ message: 'Erro ao gerar dashboard.' });
    }
};

// ==========================================
// 6. TRANSAÇÕES RECENTES (Com filtros do Dashboard)
// ==========================================
const getRecentTransactions = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { category_id, startDate, endDate } = req.query;
        
        let sql = `
            SELECT t.id, t.description, t.amount, t.type, t.status, t.date, c.name as category_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.tenant_id = $1
        `;
        let params = [tenantId];
        let pIndex = 2;

        if (startDate && endDate) {
            sql += ` AND t.date BETWEEN $${pIndex} AND $${pIndex+1}`;
            params.push(startDate, endDate);
            pIndex += 2;
        }

        if (category_id && category_id !== 'all') {
            sql += ` AND t.category_id = $${pIndex}`;
            params.push(category_id);
            pIndex++;
        }

        sql += ` ORDER BY t.date DESC, t.created_at DESC LIMIT 5`;

        const result = await query(sql, params);
        return res.json(result.rows);

    } catch (error) {
        console.error('Erro recent transactions:', error);
        return res.status(500).json({ message: 'Erro ao buscar recentes.' });
    }
};

// ==========================================
// 7. ESTATÍSTICAS POR CATEGORIA (Gráfico Pizza)
// ==========================================
const getCategoryStats = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        
        const sql = `
            SELECT c.name, SUM(t.amount) as value
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.tenant_id = $1 AND t.type = 'expense' AND t.status = 'completed'
            AND t.date >= date_trunc('month', CURRENT_DATE)
            GROUP BY c.name
            ORDER BY value DESC
            LIMIT 6
        `;

        const result = await query(sql, [tenantId]);
        
        const formatted = result.rows.map(row => ({
            name: row.name || 'Geral',
            value: parseFloat(row.value)
        }));

        return res.json(formatted);

    } catch (error) {
        console.error('Erro category stats:', error);
        return res.status(500).json({ message: 'Erro ao buscar categorias.' });
    }
};

// ==========================================
// 8. RELATÓRIO IA (Gemini)
// ==========================================
const getAiReport = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
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
// 9. DADOS PARA O GRÁFICO (Linha do Tempo filtrável)
// ==========================================
const getChartData = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { category_id, startDate, endDate } = req.query;
        
        let sql = `
            SELECT 
                TO_CHAR(date, 'DD/MM') as name,
                SUM(amount) FILTER (WHERE type = 'income' AND status = 'completed') as income,
                SUM(amount) FILTER (WHERE type = 'expense' AND status = 'completed') as expense
            FROM transactions
            WHERE tenant_id = $1 
        `;
        let params = [tenantId];
        let pIndex = 2;

        if (startDate && endDate) {
            sql += ` AND date BETWEEN $${pIndex} AND $${pIndex + 1}`;
            params.push(startDate, endDate);
            pIndex += 2;
        } else {
            sql += ` AND date >= CURRENT_DATE - INTERVAL '30 days'`;
        }

        if (category_id && category_id !== 'all') {
            sql += ` AND category_id = $${pIndex}`;
            params.push(category_id);
            pIndex++;
        }

        sql += ` GROUP BY TO_CHAR(date, 'DD/MM'), date ORDER BY date ASC`;

        const result = await query(sql, params);
        
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
    updateTransactionStatus,
    deleteTransaction,
    getDashboardSummary,
    getRecentTransactions,
    getCategoryStats,
    getAiReport,
    getChartData
};