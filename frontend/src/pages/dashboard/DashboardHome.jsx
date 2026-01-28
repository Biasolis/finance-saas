import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { AuthContext } from '../../context/AuthContext';
import styles from './DashboardHome.module.css';
import { Wallet, TrendingUp, TrendingDown, ClipboardList, AlertTriangle, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardHome() {
  const { user } = useContext(AuthContext);
  
  // Estado Unificado
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Busca paralela para performance
        const [statsRes, chartRes, recentRes] = await Promise.all([
          api.get('/dashboard/stats'),        // Nova Rota Agregada
          api.get('/transactions/chart-data'),
          api.get('/transactions/recent')
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

    fetchData();
  }, []);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (loading) {
      return (
          <DashboardLayout>
              <div style={{display:'flex', justifyContent:'center', marginTop:'3rem'}}>Carregando Visão Geral...</div>
          </DashboardLayout>
      );
  }

  return (
    <DashboardLayout>
      <div className={styles.container}>
        
        <div>
           <h1 style={{fontSize:'1.5rem', fontWeight:'bold', color:'#1f2937'}}>Painel de Controle</h1>
           <p style={{color:'#6b7280'}}>Visão 360º de <strong>{user?.companyName}</strong>.</p>
        </div>

        {/* 1. CARDS DE KPI UNIFICADOS */}
        <div className={styles.kpiGrid}>
            {/* Financeiro - Saldo */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <span>Saldo Mensal</span>
                    <Wallet size={20} color="#2563eb" />
                </div>
                <div className={styles.cardValue} style={{color: stats?.finance.balance >= 0 ? '#2563eb' : '#dc2626'}}>
                    {formatCurrency(stats?.finance.balance)}
                </div>
                <div className={styles.cardSubtext}>
                   Entradas: {formatCurrency(stats?.finance.income)}
                </div>
            </div>

            {/* Operacional - OS Abertas */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <span>Ordens de Serviço</span>
                    <ClipboardList size={20} color="#d97706" />
                </div>
                <div className={styles.cardValue} style={{color: '#d97706'}}>
                    {stats?.os.open} Abertas
                </div>
                <div className={styles.cardSubtext}>
                   {stats?.os.critical > 0 ? `${stats.os.critical} com Prioridade Alta!` : 'Operação Normal'}
                </div>
            </div>

            {/* Estoque - Alertas */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <span>Alerta de Estoque</span>
                    <AlertTriangle size={20} color="#dc2626" />
                </div>
                <div className={styles.cardValue} style={{color: stats?.stock.low > 0 ? '#dc2626' : '#16a34a'}}>
                    {stats?.stock.low} Itens
                </div>
                <div className={styles.cardSubtext}>
                   {stats?.stock.low > 0 ? 'Necessitam Reposição' : 'Estoque Saudável'}
                </div>
            </div>

            {/* Clientes */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <span>Base de Clientes</span>
                    <Users size={20} color="#059669" />
                </div>
                <div className={styles.cardValue} style={{color: '#1f2937'}}>
                    {stats?.clients.total}
                </div>
                <div className={styles.cardSubtext}>
                   Contatos Cadastrados
                </div>
            </div>
        </div>

        {/* 2. ÁREA DE GRÁFICOS E RECENTES */}
        <div className={styles.chartsGrid}>
            {/* Gráfico Principal */}
            <div className={styles.chartContainer}>
                <h3 className={styles.chartTitle}>Fluxo Financeiro (30 dias)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <Tooltip 
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f3f4f6'}}
                        />
                        <Area type="monotone" dataKey="income" name="Entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" />
                        <Area type="monotone" dataKey="expense" name="Saídas" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Lista de Recentes */}
            <div className={styles.recentSection}>
                <h3 className={styles.chartTitle}>Últimas Movimentações</h3>
                <ul className={styles.recentList}>
                    {recentTransactions.map(t => (
                        <li key={t.id} className={styles.recentItem}>
                            <div className={styles.itemInfo}>
                                <div className={`${styles.iconWrapper} ${t.type === 'income' ? styles.incomeIcon : styles.expenseIcon}`}>
                                    {t.type === 'income' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                                </div>
                                <div className={styles.itemText}>
                                    <h4>{t.description}</h4>
                                    <span>{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                                </div>
                            </div>
                            <div className={`${styles.itemAmount} ${t.type === 'income' ? styles.amountIncome : styles.amountExpense}`}>
                                {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                            </div>
                        </li>
                    ))}
                    {recentTransactions.length === 0 && <p style={{color:'#9ca3af', textAlign:'center'}}>Nenhuma atividade recente.</p>}
                </ul>
            </div>
        </div>

      </div>
    </DashboardLayout>
  );
}