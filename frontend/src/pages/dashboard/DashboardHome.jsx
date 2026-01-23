import { useEffect, useState } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import styles from './DashboardHome.module.css';
import { ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react';

export default function DashboardHome() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Formatar Moeda (BRL)
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const response = await api.get('/transactions/dashboard');
        setData(response.data);
      } catch (error) {
        console.error("Erro ao carregar dashboard", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <DashboardLayout>Carregando dados...</DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <header className={styles.header}>
        <h1 className={styles.title}>Visão Geral</h1>
        <p style={{color: '#6b7280'}}>Resumo financeiro deste mês</p>
      </header>

      {data && (
        <div className={styles.grid}>
          {/* Card Entradas */}
          <div className={styles.card}>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span className={styles.cardLabel}>Entradas (Mês)</span>
              <ArrowUpCircle color="var(--success-color)" />
            </div>
            <span className={`${styles.cardValue} ${styles.income}`}>
              {formatCurrency(data.income)}
            </span>
          </div>

          {/* Card Saídas */}
          <div className={styles.card}>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span className={styles.cardLabel}>Saídas (Mês)</span>
              <ArrowDownCircle color="var(--danger-color)" />
            </div>
            <span className={`${styles.cardValue} ${styles.expense}`}>
              {formatCurrency(data.expense)}
            </span>
          </div>

          {/* Card Saldo */}
          <div className={styles.card}>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span className={styles.cardLabel}>Saldo Atual</span>
              <Wallet color="var(--primary-color)" />
            </div>
            <span className={`${styles.cardValue} ${styles.balance}`}>
              {formatCurrency(data.balance)}
            </span>
          </div>
        </div>
      )}
      
      {/* Placeholder para gráficos ou lista recente */}
      <div style={{ padding: '2rem', background: 'white', borderRadius: '8px', boxShadow: 'var(--shadow)' }}>
        <h3>Atividades Recentes</h3>
        <p style={{ color: '#6b7280', marginTop: '1rem' }}>
          Para ver os detalhes, acesse a aba "Transações".
        </p>
      </div>

    </DashboardLayout>
  );
}