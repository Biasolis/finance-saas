import { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Sparkles, TrendingUp } from 'lucide-react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import styles from './Reports.module.css';

export default function Reports() {
  const [chartData, setChartData] = useState([]);
  const [aiInsight, setAiInsight] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Carrega dados em paralelo para performance
        const [chartRes, aiRes] = await Promise.all([
          api.get('/transactions/chart-data'),
          api.get('/transactions/ai-analysis')
        ]);

        setChartData(chartRes.data);
        setAiInsight(aiRes.data);
      } catch (error) {
        console.error("Erro ao carregar relatórios", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <DashboardLayout>
      <div className={styles.container}>
        
        {/* SEÇÃO 1: Análise IA Gemini */}
        <div className={`${styles.section} ${styles.aiCard}`}>
          <div className={styles.aiHeader}>
            <Sparkles size={24} />
            Análise Inteligente (Gemini 2.5)
          </div>
          
          {loading ? (
             <p>Gerando insights financeiros...</p>
          ) : aiInsight ? (
            <>
              {aiInsight.health_score && (
                <div className={styles.scoreBadge}>
                  Score: {aiInsight.health_score}/100
                </div>
              )}
              <div className={styles.aiContent}>
                <p><strong>Resumo:</strong> {aiInsight.summary}</p>
                {aiInsight.savings_tips?.length > 0 && (
                  <div style={{marginTop: '1rem'}}>
                    <strong>💡 Dicas de Economia:</strong>
                    <ul style={{paddingLeft: '1.5rem', marginTop: '0.5rem'}}>
                      {aiInsight.savings_tips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p>Não há dados suficientes para análise.</p>
          )}
        </div>

        {/* SEÇÃO 2: Gráfico de Fluxo */}
        <div className={styles.section}>
          <h2 className={styles.title}>
            <TrendingUp size={20} />
            Fluxo de Caixa (Últimos 30 dias)
          </h2>
          
          <div style={{ width: '100%', height: 400 }}>
            {loading ? (
              <p>Carregando gráfico...</p>
            ) : (
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Entradas" fill="var(--success-color)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Saídas" fill="var(--danger-color)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}