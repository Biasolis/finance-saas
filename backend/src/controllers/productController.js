const { query } = require('../config/db');

// ==========================================
// 1. LISTAR PRODUTOS
// ==========================================
const listProducts = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { search, low_stock } = req.query; // Filtros

        let sql = `SELECT * FROM products WHERE tenant_id = $1`;
        const params = [tenantId];
        let paramIndex = 2;

        if (search) {
            sql += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Filtro de Estoque Baixo (Alerta)
        if (low_stock === 'true') {
            sql += ` AND stock <= min_stock`;
        }

        sql += ` ORDER BY name ASC`;

        const result = await query(sql, params);
        return res.json(result.rows);

    } catch (error) {
        console.error('Erro ao listar produtos:', error);
        return res.status(500).json({ message: 'Erro ao buscar estoque.' });
    }
};

// ==========================================
// 2. CRIAR PRODUTO
// ==========================================
const createProduct = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { name, description, sale_price, cost_price, stock, min_stock } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Nome do produto é obrigatório.' });
        }

        const result = await query(
            `INSERT INTO products 
            (tenant_id, name, description, sale_price, cost_price, stock, min_stock) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *`,
            [tenantId, name, description, sale_price || 0, cost_price || 0, stock || 0, min_stock || 5]
        );

        return res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao criar produto:', error);
        return res.status(500).json({ message: 'Erro ao cadastrar produto.' });
    }
};

// ==========================================
// 3. ATUALIZAR PRODUTO
// ==========================================
const updateProduct = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { name, description, sale_price, cost_price, stock, min_stock } = req.body;

        const result = await query(
            `UPDATE products 
             SET name = $1, description = $2, sale_price = $3, cost_price = $4, stock = $5, min_stock = $6 
             WHERE id = $7 AND tenant_id = $8 
             RETURNING *`,
            [name, description, sale_price, cost_price, stock, min_stock, id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }

        return res.json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        return res.status(500).json({ message: 'Erro ao atualizar estoque.' });
    }
};

// ==========================================
// 4. DELETAR PRODUTO
// ==========================================
const deleteProduct = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;

        const result = await query(
            'DELETE FROM products WHERE id = $1 AND tenant_id = $2 RETURNING id',
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }

        return res.json({ message: 'Produto removido.' });

    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        return res.status(500).json({ message: 'Erro ao remover produto.' });
    }
};

module.exports = {
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct
};