const rateLimit = require('express-rate-limit');

// 1. Limitador Geral (API inteira)
// Evita DDoS simples e uso excessivo
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutos
	max: 300, // Limite de 300 requisições por IP a cada 15 min
	standardHeaders: true, 
	legacyHeaders: false, 
    message: {
        message: "Muitas requisições deste IP, tente novamente em 15 minutos."
    }
});

// 2. Limitador de Autenticação (Login/Register/Forgot)
// Proteção estrita contra Força Bruta
const authLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hora
	max: 10, // Apenas 10 tentativas falhas por hora por IP
	standardHeaders: true, 
	legacyHeaders: false,
    message: {
        message: "Muitas tentativas de acesso. Sua conta/IP foi temporariamente bloqueado por segurança. Tente novamente em 1 hora."
    }
});

module.exports = { apiLimiter, authLimiter };