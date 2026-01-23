import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './Transactions.module.css';
import { Plus, Loader2 } from 'lucide-react';

export default function Transactions() {
  const { addToast } = useContext(ToastContext);
  
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estado do Formulário
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    cost_type: 'variable',
    date: new Date().toISOString().split('T')[0],
    use_ai_category: true // Padrão ativado pois é o diferencial do SaaS
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    try {
      const response = await api.get('/transactions');
      setTransactions(response.data.data);
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erro ao carregar transações' });
    } finally {
      setLoading(false);
    }
  }

  // Handler de envio do form
  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);

    try {
      await api.post('/transactions', {
        ...formData,
        amount: parseFloat(formData.amount) // Converter string para numero
      });
      
      addToast({ type: 'success', title: 'Transação salva com sucesso!' });
      setIsModalOpen(false);
      setFormData({ // Reset form
        description: '',
        amount: '',
        type: 'expense',
        cost_type: 'variable',
        date: new Date().toISOString().split('T')[0],
        use_ai_category: true
      });
      loadTransactions(); // Recarrega a lista
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erro ao salvar transação' });
    } finally {
      setIsSaving(false);
    }
  }

  // Formatadores
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR');

  return (
    <DashboardLayout>
      <div className={styles.headerAction}>
        <h2>Transações</h2>
        <button onClick={() => setIsModalOpen(true)} className={styles.btnNew}>
          <Plus size={18} /> Nova Transação
        </button>
      </div>

      <div className={styles.container}>
        {loading ? (
          <div style={{padding: '2rem', textAlign: 'center'}}>Carregando...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Tipo</th>
                <th>Custo</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{formatDate(t.date)}</td>
                  <td>{t.description}</td>
                  <td>{t.category_id ? 'Processado IA' : 'Geral'}</td>
                  <td style={{ fontWeight: 'bold' }}>{formatCurrency(t.amount)}</td>
                  <td>
                    <span className={`${styles.badge} ${t.type === 'income' ? styles.badgeIncome : styles.badgeExpense}`}>
                      {t.type === 'income' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td>{t.cost_type === 'fixed' ? 'Fixo' : 'Variável'}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                 <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem'}}>Nenhuma transação encontrada.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL DE CRIAÇÃO */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Transação">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div>
            <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Descrição</label>
            <input 
              required
              type="text" 
              className={styles.input} // Reutilizando estilo se possível, ou criar novo
              placeholder="Ex: Servidores AWS"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px'}}
            />
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Valor (R$)</label>
              <input 
                required
                type="number" 
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
                style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px'}}
              />
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Data</label>
              <input 
                required
                type="date" 
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px'}}
              />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Tipo</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px'}}
              >
                <option value="expense">Saída (Despesa)</option>
                <option value="income">Entrada (Receita)</option>
              </select>
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Custo</label>
              <select 
                value={formData.cost_type}
                onChange={e => setFormData({...formData, cost_type: e.target.value})}
                style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px'}}
              >
                <option value="variable">Variável</option>
                <option value="fixed">Fixo</option>
              </select>
            </div>
          </div>

          {/* Toggle IA Gemini */}
          <div style={{
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            background: '#f0f9ff', 
            padding: '0.75rem', 
            borderRadius: '6px',
            border: '1px solid #bae6fd'
          }}>
            <input 
              type="checkbox" 
              id="aiToggle"
              checked={formData.use_ai_category}
              onChange={e => setFormData({...formData, use_ai_category: e.target.checked})}
              style={{width: '16px', height: '16px', cursor: 'pointer'}}
            />
            <label htmlFor="aiToggle" style={{fontSize: '0.9rem', cursor: 'pointer', color: '#0369a1'}}>
              <strong>Gemini AI:</strong> Categorizar automaticamente
            </label>
          </div>

          <button 
            type="submit" 
            className={styles.btnNew} 
            disabled={isSaving}
            style={{justifyContent: 'center', marginTop: '1rem'}}
          >
            {isSaving ? (
              <> <Loader2 className="spin" size={20} /> Processando... </>
            ) : 'Salvar Transação'}
          </button>

        </form>
      </Modal>
    </DashboardLayout>
  );
}