import { useEffect, useState, useContext, useMemo } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import styles from './Reports.module.css';
import { Sparkles, Download, FileSpreadsheet, Lightbulb, Activity, PieChart } from 'lucide-react';
import * as XLSX from 'xlsx'; // NECESSÁRIO RODAR: npm install xlsx

export default function Reports() {
  const { addToast } = useContext(ToastContext);
  
  const [activeTab, setActiveTab] = useState('dre'); // dre | extract | categories
  const [categoriesList, setCategoriesList] = useState([]);

  // Dados DRE
  const [financials, setFinancials] = useState(null);
  
  // Dados Extrato
  const [extract, setExtract] = useState([]);
  const [extractFilter, setExtractFilter] = useState({
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      category_id: 'all'
  });

  // Dados Custos Categoria
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);

  const [loading, setLoading] = useState(true);
  
  // Estado da IA
  const [aiData, setAiData] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    loadFinancials();
    loadCategoriesList();
  }, []);

  useEffect(() => {
      if(activeTab === 'extract') {
          loadExtract();
      } else if (activeTab === 'categories') {
          loadCategoryBreakdown();
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

  async function loadCategoriesList() {
      try {
          const res = await api.get('/categories');
          setCategoriesList(res.data);
      } catch (err) { console.error(err); }
  }

  async function loadExtract() {
      try {
          const res = await api.get(`/reports/extract?startDate=${extractFilter.startDate}&endDate=${extractFilter.endDate}&category_id=${extractFilter.category_id}`);
          setExtract(res.data);
      } catch (error) {
          console.error(error);
      }
  }

  async function loadCategoryBreakdown() {
      try {
          const res = await api.get(`/reports/categories?startDate=${extractFilter.startDate}&endDate=${extractFilter.endDate}&type=expense`);
          setCategoryBreakdown(res.data);
      } catch (error) {
          console.error(error);
      }
  }

  async function generateAiReport() {
    setLoadingAi(true);
    try {
      const response = await api.get('/reports/ai-analysis');
      setAiData(response.data); 
    } catch (error) {
      addToast({ type: 'error', title: 'Erro ao consultar IA' });
    } finally {
      setLoadingAi(false);
    }
  }

  // ==== CÁLCULO DE TOTAIS DO EXTRATO NO FRONTEND ====
  const extractTotals = useMemo(() => {
      let income = 0;
      let expense = 0;
      
      extract.forEach(item => {
          if (item.status === 'completed') {
              if (item.type === 'income') income += parseFloat(item.amount);
              if (item.type === 'expense') expense += parseFloat(item.amount);
          }
      });
      
      return { income, expense, balance: income - expense };
  }, [extract]);

  // ==== EXPORTAÇÃO EXCEL ====
  const exportExtractToExcel = () => {
      const worksheet = XLSX.utils.json_to_sheet(extract.map(row => ({
          'Data Venc.': formatDate(row.competence_date),
          'Data Registro': formatDateTime(row.registration_date),
          'Descrição': row.description,
          'Cliente/Forn.': row.client_name || '-',
          'Categoria': row.category_name || 'Geral',
          'Cadastrado Por': row.created_by_name,
          'Status': row.status === 'completed' ? 'Realizado' : 'Pendente',
          'Tipo': row.type === 'income' ? 'Entrada' : 'Saída',
          'Valor (R$)': row.amount
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Extrato");
      XLSX.writeFile(workbook, "Relatorio_Extrato.xlsx");
      addToast({ type: 'success', title: 'Planilha Exportada com Sucesso!' });
  };

  const exportCategoriesToExcel = () => {
      const worksheet = XLSX.utils.json_to_sheet(categoryBreakdown.map(row => ({
          'Categoria': row.name,
          'Total Gasto (R$)': row.total
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Custos por Categoria");
      XLSX.writeFile(workbook, "Relatorio_Categorias.xlsx");
      addToast({ type: 'success', title: 'Planilha Exportada com Sucesso!' });
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (date) => new Date(date).toLocaleDateString('pt-BR');
  const formatDateTime = (date) => new Date(date).toLocaleString('pt-BR');

  const getScoreColor = (score) => {
      if(score >= 80) return '#16a34a'; 
      if(score >= 50) return '#ca8a04'; 
      return '#dc2626'; 
  };

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
            <h2>Relatórios Financeiros</h2>
            <p>Análise completa e detalhada da sua operação.</p>
        </div>

        {/* ABAS DE NAVEGAÇÃO */}
        <div style={{display:'flex', gap:'10px', borderBottom:'1px solid #e5e7eb', marginBottom:'10px'}}>
            <button 
                onClick={() => setActiveTab('dre')}
                style={{
                    padding:'10px 20px', border:'none', 
                    background: activeTab === 'dre' ? 'white' : 'transparent',
                    borderBottom: activeTab === 'dre' ? '2px solid var(--primary-color)' : 'none',
                    color: activeTab === 'dre' ? 'var(--primary-color)' : '#6b7280',
                    fontWeight: 'bold', cursor:'pointer'
                }}
            >
                DRE Gerencial
            </button>
            <button 
                onClick={() => setActiveTab('categories')}
                style={{
                    padding:'10px 20px', border:'none', 
                    background: activeTab === 'categories' ? 'white' : 'transparent',
                    borderBottom: activeTab === 'categories' ? '2px solid var(--primary-color)' : 'none',
                    color: activeTab === 'categories' ? 'var(--primary-color)' : '#6b7280',
                    fontWeight: 'bold', cursor:'pointer'
                }}
            >
                Custos por Categoria
            </button>
            <button 
                onClick={() => setActiveTab('extract')}
                style={{
                    padding:'10px 20px', border:'none', 
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
                {/* 1. ABA DRE */}
                {activeTab === 'dre' && (
                    <div className={styles.card}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1rem'}}>
                            <h3>Fluxo de Caixa Mensal - {financials?.year}</h3>
                            <button className={styles.btnAction} onClick={() => window.print()} title="Imprimir">
                                <Download size={18} /> Exportar PDF
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
                        
                        {/* SEÇÃO IA */}
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
                                    <div className={styles.aiContent}>
                                        <div dangerouslySetInnerHTML={{ __html: aiData.summary }} />
                                    </div>

                                    <div className={styles.aiSidebar}>
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

                {/* 2. ABA CUSTOS POR CATEGORIA */}
                {activeTab === 'categories' && (
                    <div className={styles.card}>
                         <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'10px'}}>
                            <h3>Detalhamento de Custos (Saídas Concluídas)</h3>
                            <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                                <input 
                                    type="date" className={styles.dateInput}
                                    value={extractFilter.startDate}
                                    onChange={e => setExtractFilter({...extractFilter, startDate: e.target.value})}
                                />
                                <span>até</span>
                                <input 
                                    type="date" className={styles.dateInput}
                                    value={extractFilter.endDate}
                                    onChange={e => setExtractFilter({...extractFilter, endDate: e.target.value})}
                                />
                                <button className={styles.btnAction} onClick={exportCategoriesToExcel} style={{background: '#16a34a', color:'white', border:'none'}}>
                                    <FileSpreadsheet size={18} /> Exportar Excel
                                </button>
                            </div>
                        </div>

                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Nome da Categoria</th>
                                        <th>Total de Custos</th>
                                        <th>Representação (%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categoryBreakdown.map(row => {
                                        const totalAll = categoryBreakdown.reduce((acc, curr) => acc + curr.total, 0);
                                        const percent = totalAll > 0 ? ((row.total / totalAll) * 100).toFixed(1) : 0;
                                        return (
                                        <tr key={row.name}>
                                            <td style={{fontWeight:'500'}}><PieChart size={14} style={{marginRight:'5px'}}/> {row.name}</td>
                                            <td style={{color:'#991b1b', fontWeight:'bold'}}>{formatCurrency(row.total)}</td>
                                            <td>
                                                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                    <span>{percent}%</span>
                                                    <div style={{width:'100%', background:'#e5e7eb', height:'8px', borderRadius:'4px'}}>
                                                        <div style={{width: `${percent}%`, background:'#dc2626', height:'100%', borderRadius:'4px'}}></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )})}
                                    {categoryBreakdown.length === 0 && <tr><td colSpan="3" style={{textAlign:'center', padding:'20px'}}>Nenhum custo no período.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. ABA EXTRATO DETALHADO */}
                {activeTab === 'extract' && (
                    <div className={styles.card}>
                         <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'10px'}}>
                            <h3>Extrato de Lançamentos</h3>
                            <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                                <select 
                                    value={extractFilter.category_id} 
                                    onChange={(e) => setExtractFilter({...extractFilter, category_id: e.target.value})}
                                    style={{padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: '6px'}}
                                >
                                    <option value="all">Todas as Categorias</option>
                                    {categoriesList.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
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
                                <button className={styles.btnAction} onClick={exportExtractToExcel} style={{background: '#16a34a', color:'white', border:'none'}}>
                                    <FileSpreadsheet size={18} /> Exportar Excel
                                </button>
                            </div>
                        </div>

                        {/* RESUMO DO EXTRATO FILTRADO */}
                        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))', gap:'10px', marginBottom:'1rem', background:'#f9fafb', padding:'1rem', borderRadius:'8px', border:'1px solid #e5e7eb'}}>
                            <div>
                                <span style={{color:'#6b7280', fontSize:'0.85rem'}}>Total Entradas (Realizadas)</span>
                                <h3 style={{color:'#16a34a', margin:0}}>{formatCurrency(extractTotals.income)}</h3>
                            </div>
                            <div>
                                <span style={{color:'#6b7280', fontSize:'0.85rem'}}>Total Saídas (Realizadas)</span>
                                <h3 style={{color:'#dc2626', margin:0}}>{formatCurrency(extractTotals.expense)}</h3>
                            </div>
                            <div>
                                <span style={{color:'#6b7280', fontSize:'0.85rem'}}>Balanço do Período</span>
                                <h3 style={{color: extractTotals.balance >= 0 ? '#2563eb' : '#dc2626', margin:0}}>
                                    {formatCurrency(extractTotals.balance)}
                                </h3>
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