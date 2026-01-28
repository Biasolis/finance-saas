const { query } = require('../config/db');

// ==========================================
// 1. LISTAR RECORRÊNCIAS
// ==========================================
const listRecurring = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const result = await query(
            'SELECT * FROM recurring_transactions WHERE tenant_id = $1 ORDER BY next_run ASC',
            [tenantId]
        );
        return res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar recorrentes:', error);
        return res.status(500).json({ message: 'Erro ao buscar dados.' });
    }
};

// ==========================================
// 2. CRIAR RECORRÊNCIA
// ==========================================
const createRecurring = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { description, amount, type, frequency, start_date, category_id } = req.body;

        if (!description || !amount || !start_date) {
            return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
        }

        // Define a primeira execução como a data de início
        const result = await query(
            `INSERT INTO recurring_transactions 
            (tenant_id, description, amount, type, frequency, start_date, next_run, category_id, active) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) 
            RETURNING *`,
            [tenantId, description, amount, type, frequency || 'monthly', start_date, start_date, category_id || null]
        );

        return res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao criar recorrência:', error);
        return res.status(500).json({ message: 'Erro ao salvar recorrência.' });
    }
};

// ==========================================
// 3. PROCESSAR RECORRÊNCIAS VENCIDAS
// ==========================================
// Esta função verifica tudo que tem next_run <= HOJE e gera as transações reais
const processDueTransactions = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;

        // 1. Busca recorrentes ativas que venceram (ou vencem hoje)
        const due = await query(
            `SELECT * FROM recurring_transactions 
             WHERE tenant_id = $1 AND active = true AND next_run <= CURRENT_DATE`,
            [tenantId]
        );

        let processedCount = 0;

        for (const rec of due.rows) {
            // A. Insere na tabela oficial de transações
            await query(
                `INSERT INTO transactions 
                (tenant_id, description, amount, type, cost_type, status, date, category_id, created_by) 
                VALUES ($1, $2, $3, $4, 'fixed', 'pending', $5, $6, $7)`,
                [tenantId, `${rec.description} (Recorrente)`, rec.amount, rec.type, rec.next_run, rec.category_id, userId]
            );

            // B. Calcula próxima data
            let nextDate = new Date(rec.next_run);
            if (rec.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
            else if (rec.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
            else if (rec.frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

            // C. Atualiza a recorrência com a nova data
            await query(
                'UPDATE recurring_transactions SET next_run = $1 WHERE id = $2',
                [nextDate, rec.id]
            );

            processedCount++;
        }

        return res.json({ message: 'Processamento concluído.', processed: processedCount });

    } catch (error) {
        console.error('Erro ao processar recorrentes:', error);
        return res.status(500).json({ message: 'Erro no processamento automático.' });
    }
};

// ==========================================
// 4. EXCLUIR RECORRÊNCIA
// ==========================================
const deleteRecurring = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        await query('DELETE FROM recurring_transactions WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        return res.json({ message: 'Removido com sucesso.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao remover.' });
    }
};

module.exports = {
    listRecurring,
    createRecurring,
    processDueTransactions,
    deleteRecurring
};