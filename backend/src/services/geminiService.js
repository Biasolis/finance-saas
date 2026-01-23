const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Inicializa o cliente do Gemini
// Atenção: Certifique-se de que GEMINI_API_KEY está no seu .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configuração do modelo solicitado (Flash 2.5)
// Nota: Ajuste o nome do modelo conforme a disponibilidade exata na API (ex: gemini-2.0-flash-exp ou gemini-1.5-flash se o 2.5 ainda for preview)
const MODEL_NAME = "gemini-2.0-flash-exp"; 

const generateFinancialInsight = async (transactions, period) => {
    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        // Prepara os dados para serem leves (token efficiency)
        const summaryData = transactions.map(t => 
            `${t.date.toISOString().split('T')[0]}: ${t.description} - R$ ${t.amount} (${t.type})`
        ).join('\n');

        const prompt = `
            Você é um assistente financeiro empresarial especialista.
            Analise as seguintes transações financeiras do período de ${period}.
            
            Dados:
            ${summaryData}

            Tarefa:
            1. Identifique padrões de gastos.
            2. Sugira onde a empresa pode economizar.
            3. Dê um breve parecer sobre a saúde financeira baseada apenas nestes dados.
            
            Formato da resposta: JSON contendo chaves 'summary', 'savings_tips', 'health_score' (0 a 100).
            Responda APENAS o JSON, sem markdown.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Limpeza básica para garantir JSON válido
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(jsonStr);

    } catch (error) {
        console.error("Erro ao chamar Gemini:", error);
        // Retorno de fallback para não quebrar a aplicação se a IA falhar
        return {
            summary: "Não foi possível gerar a análise no momento.",
            savings_tips: [],
            health_score: null
        };
    }
};

const categorizeTransaction = async (description) => {
    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        
        const prompt = `
            Categorize a seguinte transação financeira em uma categoria curta (máx 2 palavras).
            Exemplos: "Servidores", "Marketing", "Salários", "Vendas", "Impostos".
            Transação: "${description}"
            Responda apenas a categoria.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("Erro na categorização automática:", error);
        return "Geral";
    }
};

module.exports = {
    generateFinancialInsight,
    categorizeTransaction
};