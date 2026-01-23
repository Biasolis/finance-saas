const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    try {
        console.log('🔄 Iniciando configuração do Banco de Dados...');
        
        // Lê o arquivo SQL
        const sqlPath = path.join(__dirname, '../../../database/init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Executa o SQL
        await pool.query(sql);
        
        console.log('✅ Banco de dados configurado com sucesso!');
        console.log('✅ Tabelas criadas/verificadas.');
    } catch (error) {
        console.error('❌ Erro ao configurar banco de dados:', error);
    } finally {
        await pool.end();
    }
}

setupDatabase();