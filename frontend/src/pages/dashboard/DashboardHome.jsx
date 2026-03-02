import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import styles from './DashboardHome.module.css';
import { Wallet, TrendingUp, TrendingDown, ClipboardList, AlertTriangle, Users, ArrowUpRight, ArrowDownRight, FileSpreadsheet } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

export default function DashboardHome() {
  const { user } = useContext(AuthContext);
  const { addToast } = useContext(ToastContext);
  
  // Estado Unificado
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Filtros (Inicia no mês atual)
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDate, setFilterDate] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => { loadCategories(); }, []);

  useEffect(() => {
    fetchData();
  }, [filterCategory, filterDate]);

  async function loadCategories() {
    try { const res = await api.get('/categories'); setCategories(res.data); } 
    catch (err) { console.error(err); }
  }

  async function fetchData() {
    setLoading(true);
    try {
      const qParams = `?startDate=${filterDate.startDate}&endDate=${filterDate.endDate}&category_id=${filterCategory}`;
      
      const [statsRes, chartRes, recentRes] = await Promise.all([
        api.get(`/dashboard/stats${qParams}`),
        api.get(`/transactions/chart-data${qParams}`),
        api.get(`/transactions/recent${qParams}`)
      ]);

      setStats(statsRes.data);
      setChartData(chartRes.data);
      setRecentTransactions(recentRes.data);

    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  const exportDashboardToExcel = () => {
        // Aba de Resumo KPI
        const kpiSheet = XLSX.utils.json_to_sheet([{
            'Saldo do Período': stats?.finance.balance,
            'Total Entradas': stats?.finance.income,
            'Total Saídas': stats?.finance.expense,
            'OS Abertas': stats?.os.open,
            'OS Críticas': stats?.os.critical,
            'Produtos Estoque Baixo': stats?.stock.low,
            'Total de Clientes': stats?.clients.total
        }]);

        // Aba das movimentações recentes
        const transactionsSheet = XLSX.utils.json_to_sheet(recentTransactions.map(t => ({
            'Data': new Date(t.date).toLocaleDateString('pt-BR'),
            'Descrição': t.description,
            'Categoria': t.category_name || 'Geral',
            'Tipo': t.type === 'income' ? 'Entrada' : 'Saída',
            'Status': t.status === 'completed' ? 'Concluído' : 'Pendente',
            'Valor (R$)': t.amount
        })));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, kpiSheet, "Resumo Executivo (KPIs)");
        XLSX.utils.book_append_sheet(workbook, transactionsSheet, "Últimas Movimentações");
        
        XLSX.writeFile(workbook, "Relatorio_Dashboard_SaaS.xlsx");
        addToast({ type: 'success', title: 'Dashboard exportado com sucesso!' });
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <DashboardLayout>
      <div className={styles.container}>
        
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'1rem'}}>
           <div>
               <h1 style={{fontSize:'1.5rem', fontWeight:'bold', color:'#1f2937'}}>Painel de Controle</h1>
               <p style={{color:'#6b7280'}}>Visão 360º de <strong>{user?.companyName}</strong>.</p>
           </div>
           
           {/* BARRA DE FILTROS DO DASHBOARD */}
           <div style={{display:'flex', gap:'10px', alignItems:'center', background:'white', padding:'0.75rem', borderRadius:'8px', border:'1px solid #e5e7eb'}}>
                <div style={{display:'flex', flexDirection:'column'}}>
                    <span style={{fontSize:'0.75rem', color:'#6b7280', marginBottom:'2px'}}>Categoria (Financeiro)</span>
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{padding:'0.4rem', border:'1px solid #d1d5db', borderRadius:'6px'}}>
                        <option value="all">Todas</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                </div>
                <div style={{display:'flex', flexDirection:'column'}}>
                    <span style={{fontSize:'0.75rem', color:'#6b7280', marginBottom:'2px'}}>Início</span>
                    <input type="date" value={filterDate.startDate} onChange={e => setFilterDate({...filterDate, startDate: e.target.value})} style={{padding:'0.4rem', border:'1px solid #d1d5db', borderRadius:'6px'}}/>
                </div>
                <div style={{display:'flex', flexDirection:'column'}}>
                    <span style={{fontSize:'0.75rem', color:'#6b7280', marginBottom:'2px'}}>Fim</span>
                    <input type="date" value={filterDate.endDate} onChange={e => setFilterDate({...filterDate, endDate: e.target.value})} style={{padding:'0.4rem', border:'1px solid #d1d5db', borderRadius:'6px'}}/>
                </div>
                <button onClick={exportDashboardToExcel} style={{background: '#16a34a', color:'white', border:'none', padding:'0.5rem 1rem', borderRadius:'6px', display:'flex', alignItems:'center', gap:'5px', cursor:'pointer', alignSelf:'flex-end'}}>
                    <FileSpreadsheet size={18} /> Excel
                </button>
           </div>
        </div>

        {loading ? (
             <div style={{display:'flex', justifyContent:'center', marginTop:'3rem'}}>Carregando Visão Geral...</div>
        ) : (
            <>
                {/* 1. CARDS DE KPI UNIFICADOS */}
                <div className={styles.kpiGrid}>
                    <div className={styles.card}>
                        <div className={styles.cardHeader}><span>Saldo Filtrado</span><Wallet size={20} color="#2563eb" /></div>
                        <div className={styles.cardValue} style={{color: stats?.finance.balance >= 0 ? '#2563eb' : '#dc2626'}}>{formatCurrency(stats?.finance.balance)}</div>
                        <div className={styles.cardSubtext}>Entradas: {formatCurrency(stats?.finance.income)}</div>
                    </div>
                    <div className={styles.card}>
                        <div className={styles.cardHeader}><span>Ordens de Serviço</span><ClipboardList size={20} color="#d97706" /></div>
                        <div className={styles.cardValue} style={{color: '#d97706'}}>{stats?.os.open} Abertas</div>
                        <div className={styles.cardSubtext}>{stats?.os.critical > 0 ? `${stats.os.critical} com Prioridade Alta!` : 'Operação Normal'}</div>
                    </div>
                    <div className={styles.card}>
                        <div className={styles.cardHeader}><span>Alerta de Estoque</span><AlertTriangle size={20} color="#dc2626" /></div>
                        <div className={styles.cardValue} style={{color: stats?.stock.low > 0 ? '#dc2626' : '#16a34a'}}>{stats?.stock.low} Itens</div>
                        <div className={styles.cardSubtext}>{stats?.stock.low > 0 ? 'Necessitam Reposição' : 'Estoque Saudável'}</div>
                    </div>
                    <div className={styles.card}>
                        <div className={styles.cardHeader}><span>Base de Clientes</span><Users size={20} color="#059669" /></div>
                        <div className={styles.cardValue} style={{color: '#1f2937'}}>{stats?.clients.total}</div>
                        <div className={styles.cardSubtext}>Contatos Cadastrados</div>
                    </div>
                </div>

                {/* 2. ÁREA DE GRÁFICOS E RECENTES */}
                <div className={styles.chartsGrid}>
                    <div className={styles.chartContainer}>
                        <h3 className={styles.chartTitle}>Fluxo Financeiro no Período</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                                </defs>
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f3f4f6'}} />
                                <Area type="monotone" dataKey="income" name="Entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="expense" name="Saídas" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className={styles.recentSection}>
                        <h3 className={styles.chartTitle}>Resultados Filtrados</h3>
                        <ul className={styles.recentList}>
                            {recentTransactions.map(t => (
                                <li key={t.id} className={styles.recentItem}>
                                    <div className={styles.itemInfo}>
                                        <div className={`${styles.iconWrapper} ${t.type === 'income' ? styles.incomeIcon : styles.expenseIcon}`}>
                                            {t.type === 'income' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                                        </div>
                                        <div className={styles.itemText}>
                                            <h4>{t.description}</h4>
                                            <span>{new Date(t.date).toLocaleDateString('pt-BR')} - {t.category_name || 'Geral'}</span>
                                        </div>
                                    </div>
                                    <div className={`${styles.itemAmount} ${t.type === 'income' ? styles.amountIncome : styles.amountExpense}`}>
                                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                                    </div>
                                </li>
                            ))}
                            {recentTransactions.length === 0 && <p style={{color:'#9ca3af', textAlign:'center'}}>Nenhuma atividade encontrada neste filtro.</p>}
                        </ul>
                    </div>
                </div>
            </>
        )}
      </div>
    </DashboardLayout>
  );
}