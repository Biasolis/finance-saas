const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

// Middlewares Globais
app.use(helmet()); 
app.use(cors()); 
app.use(express.json()); 

// Importação das Rotas
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes'); // <--- NOVO
const superAdminRoutes = require('./routes/superAdminRoutes');

// Rota de Health Check
app.get('/health', async (req, res) => {
    const { query } = require('./config/db');
    try {
        await query('SELECT 1');
        res.status(200).json({ status: 'ok', database: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'error', database: 'disconnected' });
    }
});

// Definição das Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes); // <--- NOVO
app.use('/api/admin', superAdminRoutes);

// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;