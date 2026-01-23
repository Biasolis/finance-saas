const app = require('./src/app');
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`🔧 Ambiente: ${process.env.NODE_ENV}`);
});