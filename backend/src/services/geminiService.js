const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Inicializa o cliente do Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Usando o modelo flash 1.5 que é mais rápido e tem cotas melhores no tier gratuito
const MODEL_NAME = "gemini-2.5-flash"; 

const generateFinancialInsight = async (transactions, period) => {
    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        // Prepara os dados de forma otimizada
        const summaryData = transactions.map(t => 
            `${t.date.toISOString().split('T')[0]} | ${t.description} | R$ ${t.amount} | ${t.type}`
        ).join('\n');

        // PROMPT "CFO SÊNIOR"
        const prompt = `
            Atue como um Consultor Financeiro Sênior (CFO) especializado em otimização de fluxo de caixa para empresas.
            
            Analise rigorosamente as transações abaixo do período: ${period}.
            
            DADOS DAS TRANSAÇÕES:
            ${summaryData}

            SEUS OBJETIVOS:
            1. **Diagnóstico**: Identifique a saúde real do caixa. Estamos queimando dinheiro ou lucrando?
            2. **Anomalias**: Aponte gastos suspeitos, duplicados ou valores muito acima da média.
            3. **Ação Tática**: Dê sugestões de corte de custos diretas (ex: "Corte assinaturas não identificadas").
            
            FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
            {
                "health_score": (Número inteiro de 0 a 100),
                "health_label": (String curta: "Crítico", "Atenção", "Estável" ou "Excelente"),
                "summary": (String contendo uma análise completa formatada em HTML. Use tags <p>, <strong>, <ul>, <li> para estruturar o texto. NÃO use markdown, apenas HTML válido. Foque em insights de tendências),
                "savings_tips": (Array de Strings, contendo 3 a 5 dicas curtas e acionáveis para economizar imediatamente)
            }

            Responda APENAS o JSON válido, sem blocos de código markdown.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Limpeza de segurança para garantir JSON válido
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(jsonStr);

    } catch (error) {
        console.error("Erro ao chamar Gemini:", error);
        return {
            health_score: 0,
            health_label: "Indisponível",
            summary: "<p>Não foi possível gerar a análise detalhada no momento devido a uma instabilidade na IA. Por favor, tente novamente em alguns instantes.</p>",
            savings_tips: []
        };
    }
};

const categorizeTransaction = async (description) => {
    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        
        const prompt = `
            Você é um classificador contábil.
            Categorize a transação: "${description}"
            
            Use APENAS uma destas categorias padrão se possível: 
            [Serviços, Marketing, Infraestrutura, Pessoal, Impostos, Vendas, Administrativo, Transporte, Alimentação, Financeiro].
            
            Se não se encaixar, crie uma categoria curta (máx 2 palavras).
            Responda apenas o nome da categoria, sem pontuação.
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