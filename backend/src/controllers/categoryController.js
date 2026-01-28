const { query } = require('../config/db');

// ==========================================
// 1. LISTAR CATEGORIAS
// ==========================================
const listCategories = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const result = await query(
            'SELECT * FROM categories WHERE tenant_id = $1 ORDER BY name ASC',
            [tenantId]
        );
        return res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar categorias:', error);
        return res.status(500).json({ message: 'Erro ao buscar categorias.' });
    }
};

// ==========================================
// 2. CRIAR CATEGORIA
// ==========================================
const createCategory = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { name, type } = req.body; // type: income ou expense

        if (!name || !type) {
            return res.status(400).json({ message: 'Nome e tipo são obrigatórios.' });
        }

        const result = await query(
            'INSERT INTO categories (tenant_id, name, type) VALUES ($1, $2, $3) RETURNING *',
            [tenantId, name, type]
        );

        return res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        return res.status(500).json({ message: 'Erro ao salvar categoria.' });
    }
};

// ==========================================
// 3. DELETAR CATEGORIA
// ==========================================
const deleteCategory = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;

        // Verifica se existem transações usando esta categoria
        const check = await query('SELECT id FROM transactions WHERE category_id = $1 LIMIT 1', [id]);
        
        if (check.rows.length > 0) {
            return res.status(400).json({ 
                message: 'Não é possível excluir: existem transações vinculadas a esta categoria.' 
            });
        }

        await query('DELETE FROM categories WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        return res.json({ message: 'Categoria removida.' });

    } catch (error) {
        console.error('Erro ao deletar categoria:', error);
        return res.status(500).json({ message: 'Erro ao remover categoria.' });
    }
};

module.exports = {
    listCategories,
    createCategory,
    deleteCategory
};