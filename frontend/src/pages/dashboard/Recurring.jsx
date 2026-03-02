import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './Recurring.module.css';
import { Plus, RefreshCw, Trash2, Calendar } from 'lucide-react';

export default function Recurring() {
  const { addToast } = useContext(ToastContext);
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [form, setForm] = useState({
    description: '', amount: '', type: 'expense', frequency: 'monthly', start_date: ''
  });

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      const response = await api.get('/recurring');
      setItems(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleProcess() {
    try {
        const res = await api.post('/recurring/process');
        addToast({ type: 'success', title: `Processado: ${res.data.processed} geradas.` });
        loadItems();
    } catch (error) {
        addToast({ type: 'error', title: 'Erro ao processar.' });
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
        await api.post('/recurring', form);
        addToast({ type: 'success', title: 'Recorrência salva!' });
        setIsModalOpen(false);
        setForm({ description: '', amount: '', type: 'expense', frequency: 'monthly', start_date: '' });
        loadItems();
    } catch (error) {
        addToast({ type: 'error', title: 'Erro ao salvar.' });
    }
  }

  async function handleDelete(id) {
    if(!window.confirm("Remover esta recorrência?")) return;
    try {
        await api.delete(`/recurring/${id}`);
        setItems(items.filter(i => i.id !== id));
        addToast({ type: 'success', title: 'Removido.' });
    } catch (error) {
        addToast({ type: 'error', title: 'Erro.' });
    }
  }

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
            <div className={styles.title}>
                <h2>Transações Recorrentes</h2>
                <p>Gerencie assinaturas e contas fixas</p>
            </div>
            <div className={styles.actions}>
                <button className={styles.btnProcess} onClick={handleProcess}>
                    <RefreshCw size={18} /> Verificar Vencimentos
                </button>
                <button className={styles.btnNew} onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} /> Nova Recorrência
                </button>
            </div>
        </div>

        {loading ? <p>Carregando...</p> : (
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Descrição</th>
                        <th>Valor</th>
                        <th>Frequência</th>
                        <th>Próxima Execução</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(item => (
                        <tr key={item.id}>
                            <td>
                                <div style={{fontWeight: 600}}>{item.description}</div>
                                <span className={`${styles.badge} ${item.type === 'income' ? styles.badgeIncome : styles.badgeExpense}`}>
                                    {item.type === 'income' ? 'Entrada' : 'Saída'}
                                </span>
                            </td>
                            <td style={{fontWeight: 'bold'}}>{formatCurrency(item.amount)}</td>
                            <td>
                                {item.frequency === 'monthly' && 'Mensal'}
                                {item.frequency === 'weekly' && 'Semanal'}
                                {item.frequency === 'yearly' && 'Anual'}
                            </td>
                            <td>
                                <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                    <Calendar size={14}/> {new Date(item.next_run).toLocaleDateString('pt-BR')}
                                </div>
                            </td>
                            <td>
                                <button className={styles.btnDelete} onClick={() => handleDelete(item.id)}>
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {items.length === 0 && <tr><td colSpan="5" style={{textAlign:'center', color:'#9ca3af'}}>Nenhuma recorrência cadastrada.</td></tr>}
                </tbody>
            </table>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Recorrência">
            <form onSubmit={handleSave}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Descrição</label>
                    <input className={styles.input} required value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Valor (R$)</label>
                    <input className={styles.input} type="number" step="0.01" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Tipo</label>
                    <select className={styles.select} value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                        <option value="expense">Despesa (Saída)</option>
                        <option value="income">Receita (Entrada)</option>
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Frequência</label>
                    <select className={styles.select} value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})}>
                        <option value="monthly">Mensal</option>
                        <option value="weekly">Semanal</option>
                        <option value="yearly">Anual</option>
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Data de Início</label>
                    <input className={styles.input} type="date" required value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                </div>
                <button type="submit" className={styles.btnSave}>Salvar</button>
            </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}