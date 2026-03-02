const { query } = require('../config/db');

// 1. LISTAR PLANOS
const listPlans = async (req, res) => {
    try {
        const result = await query('SELECT * FROM plans ORDER BY price ASC');
        return res.json(result.rows);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao listar planos.' });
    }
};

// 2. CRIAR PLANO
const createPlan = async (req, res) => {
    try {
        const { name, max_users, ai_usage_limit, price, active } = req.body;

        if (!name) return res.status(400).json({ message: 'Nome do plano é obrigatório.' });

        const result = await query(
            `INSERT INTO plans (name, max_users, ai_usage_limit, price, active) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, max_users || 5, ai_usage_limit || 100, price || 0, active !== false]
        );

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao criar plano.' });
    }
};

// 3. ATUALIZAR PLANO
const updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, max_users, ai_usage_limit, price, active } = req.body;

        const result = await query(
            `UPDATE plans 
             SET name = $1, max_users = $2, ai_usage_limit = $3, price = $4, active = $5 
             WHERE id = $6 RETURNING *`,
            [name, max_users, ai_usage_limit, price, active, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: 'Plano não encontrado.' });

        return res.json(result.rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao atualizar plano.' });
    }
};

// 4. DELETAR PLANO
const deletePlan = async (req, res) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM plans WHERE id = $1', [id]);
        return res.json({ message: 'Plano removido.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao remover plano.' });
    }
};

module.exports = {
    listPlans,
    createPlan,
    updatePlan,
    deletePlan
};