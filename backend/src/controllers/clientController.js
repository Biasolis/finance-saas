const { query } = require('../config/db');

// ==========================================
// 1. LISTAR CLIENTES/FORNECEDORES
// ==========================================
const listClients = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { type, search } = req.query;

        let sql = `SELECT * FROM clients WHERE tenant_id = $1`;
        const params = [tenantId];
        let paramIndex = 2;

        if (type && type !== 'all') {
            sql += ` AND (type = $${paramIndex} OR type = 'both')`;
            params.push(type);
            paramIndex++;
        }

        if (search) {
            sql += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR document ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        sql += ` ORDER BY name ASC`;

        const result = await query(sql, params);
        return res.json(result.rows);

    } catch (error) {
        console.error('Erro ao listar clientes:', error);
        return res.status(500).json({ message: 'Erro ao buscar clientes.' });
    }
};

// ==========================================
// 2. CRIAR CLIENTE
// ==========================================
const createClient = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { name, email, phone, document, address, type } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Nome é obrigatório.' });
        }

        const result = await query(
            `INSERT INTO clients 
            (tenant_id, name, email, phone, document, address, type) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *`,
            [tenantId, name, email, phone, document, address, type || 'client']
        );

        return res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao criar cliente:', error);
        return res.status(500).json({ message: 'Erro ao cadastrar cliente.' });
    }
};

// ==========================================
// 3. ATUALIZAR CLIENTE
// ==========================================
const updateClient = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { name, email, phone, document, address, type } = req.body;

        const result = await query(
            `UPDATE clients 
             SET name = $1, email = $2, phone = $3, document = $4, address = $5, type = $6 
             WHERE id = $7 AND tenant_id = $8 
             RETURNING *`,
            [name, email, phone, document, address, type, id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Cliente não encontrado.' });
        }

        return res.json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        return res.status(500).json({ message: 'Erro ao atualizar dados.' });
    }
};

// ==========================================
// 4. DELETAR CLIENTE
// ==========================================
const deleteClient = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;

        // Verifica se tem OS vinculada (Opcional, mas recomendado futuramente)
        // const checkOS = await query('SELECT id FROM service_orders WHERE client_id = $1', [id]);
        // if (checkOS.rows.length > 0) return res.status(400).json({message: 'Cliente possui OS vinculadas.'});

        const result = await query(
            'DELETE FROM clients WHERE id = $1 AND tenant_id = $2 RETURNING id',
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Cliente não encontrado.' });
        }

        return res.json({ message: 'Cliente removido.' });

    } catch (error) {
        console.error('Erro ao deletar cliente:', error);
        return res.status(500).json({ message: 'Erro ao remover cliente.' });
    }
};

module.exports = {
    listClients,
    createClient,
    updateClient,
    deleteClient
};