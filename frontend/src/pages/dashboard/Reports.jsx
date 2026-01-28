import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import styles from './Reports.module.css';
import { Sparkles, Download, FileSpreadsheet, Lightbulb, Activity } from 'lucide-react';

export default function Reports() {
  const { addToast } = useContext(ToastContext);
  
  const [activeTab, setActiveTab] = useState('dre'); // dre | extract

  // Dados DRE
  const [financials, setFinancials] = useState(null);
  
  // Dados Extrato
  const [extract, setExtract] = useState([]);
  const [extractFilter, setExtractFilter] = useState({
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
  });

  const [loading, setLoading] = useState(true);
  
  // Estado da IA (Agora armazena o objeto completo)
  const [aiData, setAiData] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    loadFinancials();
  }, []);

  useEffect(() => {
      if(activeTab === 'extract') {
          loadExtract();
      }
  }, [activeTab, extractFilter]);

  async function loadFinancials() {
    try {
      const response = await api.get('/reports/financials');
      setFinancials(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function loadExtract() {
      try {
          const res = await api.get(`/reports/extract?startDate=${extractFilter.startDate}&endDate=${extractFilter.endDate}`);
          setExtract(res.data);
      } catch (error) {
          console.error(error);
      }
  }

  async function generateAiReport() {
    setLoadingAi(true);
    try {
      const response = await api.get('/reports/ai-analysis');
      setAiData(response.data); // Armazena o JSON completo (score, tips, summary)
    } catch (error) {
      addToast({ type: 'error', title: 'Erro ao consultar IA' });
    } finally {
      setLoadingAi(false);
    }
  }

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (date) => new Date(date).toLocaleDateString('pt-BR');
  const formatDateTime = (date) => new Date(date).toLocaleString('pt-BR');

  // Função para definir cor do score
  const getScoreColor = (score) => {
      if(score >= 80) return '#16a34a'; // Verde
      if(score >= 50) return '#ca8a04'; // Amarelo
      return '#dc2626'; // Vermelho
  };

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
            <h2>Relatórios Financeiros</h2>
            <p>Análise completa e detalhada da sua operação.</p>
        </div>

        {/* ABAS DE NAVEGAÇÃO INTERNA */}
        <div style={{display:'flex', gap:'10px', borderBottom:'1px solid #e5e7eb', marginBottom:'10px'}}>
            <button 
                onClick={() => setActiveTab('dre')}
                style={{
                    padding:'10px 20px', 
                    border:'none', 
                    background: activeTab === 'dre' ? 'white' : 'transparent',
                    borderBottom: activeTab === 'dre' ? '2px solid var(--primary-color)' : 'none',
                    color: activeTab === 'dre' ? 'var(--primary-color)' : '#6b7280',
                    fontWeight: 'bold', cursor:'pointer'
                }}
            >
                DRE Gerencial
            </button>
            <button 
                onClick={() => setActiveTab('extract')}
                style={{
                    padding:'10px 20px', 
                    border:'none', 
                    background: activeTab === 'extract' ? 'white' : 'transparent',
                    borderBottom: activeTab === 'extract' ? '2px solid var(--primary-color)' : 'none',
                    color: activeTab === 'extract' ? 'var(--primary-color)' : '#6b7280',
                    fontWeight: 'bold', cursor:'pointer'
                }}
            >
                Extrato Detalhado
            </button>
        </div>

        {loading ? <p>Carregando...</p> : (
            <>
                {/* 1. ABA DRE (RESUMO) */}
                {activeTab === 'dre' && (
                    <div className={styles.card}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1rem'}}>
                            <h3>Fluxo de Caixa Mensal - {financials?.year}</h3>
                            <button className={styles.btnAction} onClick={() => window.print()} title="Imprimir">
                                <Download size={18} /> Exportar
                            </button>
                        </div>
                        
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Mês</th>
                                        <th style={{color:'#166534'}}>Receitas</th>
                                        <th style={{color:'#991b1b'}}>Despesas</th>
                                        <th>Resultado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {financials?.monthly.map(m => (
                                        <tr key={m.month}>
                                            <td>{m.monthLabel}</td>
                                            <td style={{color:'#166534'}}>{formatCurrency(m.income)}</td>
                                            <td style={{color:'#991b1b'}}>{formatCurrency(m.expense)}</td>
                                            <td style={{fontWeight:'bold', color: m.result >= 0 ? '#2563eb' : '#dc2626'}}>
                                                {formatCurrency(m.result)}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className={styles.rowTotal}>
                                        <td>TOTAL ANUAL</td>
                                        <td>{formatCurrency(financials?.totals.income)}</td>
                                        <td>{formatCurrency(financials?.totals.expense)}</td>
                                        <td style={{color: financials?.totals.result >= 0 ? '#2563eb' : '#dc2626'}}>
                                            {formatCurrency(financials?.totals.result)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        {/* SEÇÃO IA COM NOVO LAYOUT */}
                        <div className={styles.aiSection} style={{marginTop:'2rem'}}>
                            <div className={styles.aiHeader}>
                                <Sparkles size={24} color="#7c3aed" />
                                <div>
                                    <h3>CFO Virtual Gemini</h3>
                                    <p>Auditoria inteligente dos seus dados financeiros.</p>
                                </div>
                            </div>
                            
                            {!aiData && !loadingAi && (
                                <button className={styles.btnAi} onClick={generateAiReport}>
                                    <Sparkles size={18} /> Gerar Auditoria Agora
                                </button>
                            )}

                            {loadingAi && (
                                <div style={{display:'flex', alignItems:'center', gap:'10px', color:'#7c3aed'}}>
                                    <div className="spin" style={{border:'2px solid #ddd', borderTop:'2px solid #7c3aed', borderRadius:'50%', width:'20px', height:'20px'}}></div>
                                    <span>Analisando padrões de gastos e receitas...</span>
                                </div>
                            )}

                            {aiData && (
                                <div className={styles.aiResultGrid}>
                                    {/* Coluna da Esquerda: Análise Texto */}
                                    <div className={styles.aiContent}>
                                        <div dangerouslySetInnerHTML={{ __html: aiData.summary }} />
                                    </div>

                                    {/* Coluna da Direita: Score e Dicas */}
                                    <div className={styles.aiSidebar}>
                                        {/* Score Card */}
                                        <div className={styles.scoreCard} style={{borderColor: getScoreColor(aiData.health_score)}}>
                                            <div style={{display:'flex', alignItems:'center', gap:'5px', color: getScoreColor(aiData.health_score)}}>
                                                <Activity size={20} />
                                                <span style={{fontWeight:'bold'}}>Saúde Financeira</span>
                                            </div>
                                            <div className={styles.scoreValue} style={{color: getScoreColor(aiData.health_score)}}>
                                                {aiData.health_score}
                                                <span style={{fontSize:'1rem', color:'#6b7280'}}>/100</span>
                                            </div>
                                            <div className={styles.scoreLabel} style={{background: getScoreColor(aiData.health_score)}}>
                                                {aiData.health_label}
                                            </div>
                                        </div>

                                        {/* Dicas Card */}
                                        <div className={styles.tipsCard}>
                                            <div style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'10px', color:'#b45309'}}>
                                                <Lightbulb size={20} />
                                                <strong>Oportunidades</strong>
                                            </div>
                                            <ul className={styles.tipsList}>
                                                {aiData.savings_tips?.map((tip, idx) => (
                                                    <li key={idx}>{tip}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        <button className={styles.btnRetry} onClick={generateAiReport}>
                                            Atualizar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. ABA EXTRATO DETALHADO */}
                {activeTab === 'extract' && (
                    <div className={styles.card}>
                         <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'10px'}}>
                            <h3>Extrato de Lançamentos</h3>
                            <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                                <input 
                                    type="date" 
                                    className={styles.dateInput}
                                    value={extractFilter.startDate}
                                    onChange={e => setExtractFilter({...extractFilter, startDate: e.target.value})}
                                />
                                <span>até</span>
                                <input 
                                    type="date" 
                                    className={styles.dateInput}
                                    value={extractFilter.endDate}
                                    onChange={e => setExtractFilter({...extractFilter, endDate: e.target.value})}
                                />
                                <button className={styles.btnAction} onClick={() => window.print()}>
                                    <FileSpreadsheet size={18} /> Imprimir
                                </button>
                            </div>
                        </div>

                        <div className={styles.tableWrapper}>
                            <table className={styles.table} style={{fontSize:'0.85rem'}}>
                                <thead>
                                    <tr>
                                        <th>Data Comp.</th>
                                        <th>Data Cadastro</th>
                                        <th>Descrição</th>
                                        <th>Envolvido (Cliente)</th>
                                        <th>Categoria</th>
                                        <th>Resp. Cadastro</th>
                                        <th>Status</th>
                                        <th>Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {extract.map(row => (
                                        <tr key={row.id}>
                                            <td>{formatDate(row.competence_date)}</td>
                                            <td style={{color:'#6b7280'}}>{formatDateTime(row.registration_date)}</td>
                                            <td style={{fontWeight:'500'}}>{row.description}</td>
                                            <td>{row.client_name || '-'}</td>
                                            <td>{row.category_name || 'Geral'}</td>
                                            <td>{row.created_by_name?.split(' ')[0]}</td>
                                            <td>
                                                <span style={{
                                                    padding:'2px 6px', borderRadius:'4px', fontSize:'0.7rem', fontWeight:'bold', textTransform:'uppercase',
                                                    background: row.status === 'completed' ? '#dcfce7' : '#fffbeb',
                                                    color: row.status === 'completed' ? '#166534' : '#b45309'
                                                }}>
                                                    {row.status === 'completed' ? 'Realizado' : 'Pendente'}
                                                </span>
                                            </td>
                                            <td style={{fontWeight:'bold', color: row.type === 'income' ? '#166534' : '#991b1b'}}>
                                                {row.type === 'income' ? '+' : '-'} {formatCurrency(row.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                    {extract.length === 0 && <tr><td colSpan="8" style={{textAlign:'center', padding:'20px'}}>Nenhum lançamento no período.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </>
        )}
      </div>
    </DashboardLayout>
  );
}