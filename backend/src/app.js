const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const compression = require('compression'); // <--- IMPORT NOVO
require('dotenv').config();

// Imports de Rotas
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const serviceOrderRoutes = require('./routes/serviceOrderRoutes');
const clientRoutes = require('./routes/clientRoutes');
const recurringRoutes = require('./routes/recurringRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const reportRoutes = require('./routes/reportRoutes');
const productRoutes = require('./routes/productRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const auditRoutes = require('./routes/auditRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const { apiLimiter, authLimiter } = require('./middlewares/rateLimiter');
const logger = require('./config/logger');

const app = express();

// --- MIDDLEWARES ---

// 1. Segurança
app.use(helmet({
    crossOriginResourcePolicy: false,
}));

// 2. Compressão (GZIP) - Deve vir antes das rotas
app.use(compression()); 

// 3. CORS
app.use(cors());

// 4. Parser
app.use(express.json());

// 5. Logger HTTP
app.use((req, res, next) => {
    logger.http(`${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});

// 6. Rate Limiting Global
app.use('/api', apiLimiter);

// 7. Arquivos Estáticos
app.use('/uploads', express.static(path.resolve(__dirname, '..', '..', 'uploads')));

// --- ROTAS ---
app.use('/api/auth', authLimiter, authRoutes); // Auth com limite mais estrito
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', superAdminRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/service-orders', serviceOrderRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/products', productRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);

// Health Check
app.get('/', (req, res) => {
    res.json({ 
        status: 'API Online 🚀', 
        version: '1.5.0',
        mode: 'PWA Ready + Compression'
    });
});

module.exports = app;