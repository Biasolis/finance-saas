const { query, pool } = require('../config/db'); // Importando pool para transações

// ==========================================
// 1. LISTAR ORDENS DE SERVIÇO
// ==========================================
const listServiceOrders = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { status, search } = req.query;

        let sql = `
            SELECT id, client_name, equipment, description, status, priority, price, created_at 
            FROM service_orders 
            WHERE tenant_id = $1
        `;
        const params = [tenantId];
        let paramIndex = 2;

        if (status && status !== 'all') {
            sql += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (search) {
            sql += ` AND (client_name ILIKE $${paramIndex} OR equipment ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        sql += ` ORDER BY created_at DESC`;

        const result = await query(sql, params);
        return res.json(result.rows);

    } catch (error) {
        console.error('Erro ao listar OS:', error);
        return res.status(500).json({ message: 'Erro ao buscar ordens de serviço.' });
    }
};

// ==========================================
// 2. CRIAR NOVA OS
// ==========================================
const createServiceOrder = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { client_name, equipment, description, priority, price } = req.body;

        if (!client_name || !equipment) {
            return res.status(400).json({ message: 'Cliente e Equipamento são obrigatórios.' });
        }

        const result = await query(
            `INSERT INTO service_orders 
            (tenant_id, client_name, equipment, description, priority, price, status) 
            VALUES ($1, $2, $3, $4, $5, $6, 'open') 
            RETURNING *`,
            [tenantId, client_name, equipment, description || '', priority || 'normal', price || 0]
        );

        return res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao criar OS:', error);
        return res.status(500).json({ message: 'Erro ao abrir ordem de serviço.' });
    }
};

// ==========================================
// 3. ATUALIZAR STATUS DA OS
// ==========================================
const updateServiceOrderStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { status } = req.body;

        const result = await query(
            `UPDATE service_orders 
             SET status = $1, updated_at = NOW() 
             WHERE id = $2 AND tenant_id = $3 
             RETURNING *`,
            [status, id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'OS não encontrada.' });
        }

        return res.json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao atualizar OS:', error);
        return res.status(500).json({ message: 'Erro ao atualizar status.' });
    }
};

// ==========================================
// 4. NOVO: FINALIZAR E FATURAR (INTEGRAÇÃO)
// ==========================================
const finishAndBillOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { id } = req.params;

        await client.query('BEGIN');

        // 1. Busca a OS para pegar os dados
        const osCheck = await client.query(
            'SELECT * FROM service_orders WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (osCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'OS não encontrada.' });
        }

        const os = osCheck.rows[0];

        // Se já estiver concluída, evita duplicidade
        if (os.status === 'completed') {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Esta OS já foi finalizada.' });
        }

        // 2. Atualiza status da OS para Concluído
        await client.query(
            "UPDATE service_orders SET status = 'completed', updated_at = NOW() WHERE id = $1",
            [id]
        );

        // 3. Cria a Transação Financeira (Receita)
        // Descrição automática: "Serviço OS #123 - Cliente X"
        const description = `Serviço OS #${os.id} - ${os.client_name}`;
        
        // Tenta achar categoria 'Serviços', senão vai null (Geral)
        // Opcional: Você pode forçar um ID de categoria aqui se quiser
        
        await client.query(
            `INSERT INTO transactions 
            (tenant_id, description, amount, type, cost_type, status, date, created_by) 
            VALUES ($1, $2, $3, 'income', 'variable', 'completed', CURRENT_DATE, $4)`,
            [tenantId, description, os.price, userId]
        );

        await client.query('COMMIT');

        return res.json({ message: 'OS finalizada e receita lançada com sucesso!' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao faturar OS:', error);
        return res.status(500).json({ message: 'Erro ao processar faturamento.' });
    } finally {
        client.release();
    }
};

// ==========================================
// 5. DELETAR OS
// ==========================================
const deleteServiceOrder = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;

        const result = await query(
            'DELETE FROM service_orders WHERE id = $1 AND tenant_id = $2 RETURNING id',
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'OS não encontrada.' });
        }

        return res.json({ message: 'Ordem de serviço removida.' });

    } catch (error) {
        console.error('Erro ao deletar OS:', error);
        return res.status(500).json({ message: 'Erro ao remover OS.' });
    }
};

module.exports = {
    listServiceOrders,
    createServiceOrder,
    updateServiceOrderStatus,
    finishAndBillOrder, // Exportado
    deleteServiceOrder
};