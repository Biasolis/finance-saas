const winston = require('winston');
const path = require('path');

// Define níveis de log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define cores para o console
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Formato do log
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define onde salvar (Arquivos + Console)
const transports = [
  // Console (Colorido)
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      format
    ),
  }),
  // Arquivo de Erros (Crítico)
  new winston.transports.File({
    filename: path.join(__dirname, '..', '..', 'logs', 'error.log'),
    level: 'error',
    format: winston.format.json(), // JSON é melhor para análise de máquina
  }),
  // Arquivo Geral (Tudo)
  new winston.transports.File({
    filename: path.join(__dirname, '..', '..', 'logs', 'combined.log'),
    format: winston.format.json(),
  }),
];

const logger = winston.createLogger({
  level: 'debug',
  levels,
  transports,
});

module.exports = logger;