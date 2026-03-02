const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Configuração da conexão
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false, // Necessário para NeonDB/Produção
});

// Listener para erros no cliente do pool (evita crash do app)
pool.on('error', (err, client) => {
  console.error('Erro inesperado no cliente do banco de dados', err);
  process.exit(-1);
});

// Função helper para queries (substitui a necessidade de ORM)
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
        // console.log('Query executada', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Erro na query:', { text, error });
    throw error;
  }
};

module.exports = {
  query,
  pool,
};