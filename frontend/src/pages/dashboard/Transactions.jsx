import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './Transactions.module.css';
import { Plus, Loader2, Check, Clock, RotateCcw, Paperclip } from 'lucide-react';

export default function Transactions() {
  const { addToast } = useContext(ToastContext);
  
  // Estados de Dados
  const [transactions, setTransactions] = useState([]);
  const [clients, setClients] = useState([]);
  const [categories, setCategories] = useState([]); 
  const [totals, setTotals] = useState(null); // Estado para guardar os totais
  const [loading, setLoading] = useState(true);
  
  // Estados de Controle
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, completed
  const [filterCategory, setFilterCategory] = useState('all');
  const [isSaving, setIsSaving] = useState(false);

  // Estado do Formulário
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    cost_type: 'variable',
    date: new Date().toISOString().split('T')[0],
    status: 'completed',
    client_id: '',
    category_id: '', // Nova Propriedade Manual
    use_ai_category: true,
    attachment_path: ''  
  });

  // Estado do Arquivo (Upload)
  const [file, setFile] = useState(null);

  // 1. Carregar dados iniciais
  useEffect(() => {
    loadTransactions();
  }, [filterStatus, filterCategory]);

  useEffect(() => {
    loadClients();
    loadCategories();
  }, []);

  async function loadTransactions() {
    setLoading(true);
    try {
      let url = `/transactions?status=${filterStatus}&category_id=${filterCategory}`;
      const response = await api.get(url);
      setTransactions(response.data.data);
      setTotals(response.data.totals); // Captura totais do backend
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erro ao carregar transações' });
    } finally {
      setLoading(false);
    }
  }

  async function loadClients() {
    try {
        const res = await api.get('/clients');
        setClients(res.data);
    } catch (error) {
        console.error("Erro ao carregar clientes", error);
    }
  }

  async function loadCategories() {
    try {
        const res = await api.get('/categories');
        setCategories(res.data);
    } catch (error) {
        console.error("Erro ao carregar categorias", error);
    }
  }

  // 2. Ação de mudar status
  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    
    // Atualização otimista na tabela
    setTransactions(prev => prev.map(t => 
        t.id === id ? { ...t, status: newStatus } : t
    ));

    try {
      await api.patch(`/transactions/${id}/status`, { status: newStatus });
      addToast({ 
        type: 'success', 
        title: newStatus === 'completed' ? 'Transação concluída!' : 'Marcado como pendente.' 
      });
      // Recarrega para atualizar os painéis de totais com os novos dados
      loadTransactions(); 
    } catch (error) {
      loadTransactions();
      addToast({ type: 'error', title: 'Erro ao atualizar status' });
    }
  }

  // 3. Salvar Nova Transação
  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);

    try {
      let finalAttachmentPath = null;

      if (file) {
          const data = new FormData();
          data.append('file', file);
          const uploadRes = await api.post('/upload', data, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
          finalAttachmentPath = uploadRes.data.url;
      }

      await api.post('/transactions', {
        ...formData,
        amount: parseFloat(formData.amount),
        client_id: formData.client_id ? parseInt(formData.client_id) : null,
        category_id: formData.category_id && !formData.use_ai_category ? parseInt(formData.category_id) : null,
        attachment_path: finalAttachmentPath
      });
      
      addToast({ type: 'success', title: 'Transação salva com sucesso!' });
      setIsModalOpen(false);
      
      setFormData({
        description: '',
        amount: '',
        type: 'expense',
        cost_type: 'variable',
        date: new Date().toISOString().split('T')[0],
        status: 'completed',
        client_id: '',
        category_id: '',
        use_ai_category: true,
        attachment_path: ''
      });
      setFile(null);
      
      loadTransactions(); 
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erro ao salvar transação' });
    } finally {
      setIsSaving(false);
    }
  }

  const openAttachment = (path) => {
      if (!path) return;
      if (path.startsWith('http')) {
          window.open(path, '_blank');
      } else {
          const baseUrl = 'http://localhost:3000'; 
          window.open(`${baseUrl}${path}`, '_blank');
      }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR');

  return (
    <DashboardLayout>
      <div className={styles.headerAction}>
        <div style={{display:'flex', gap:'1rem', alignItems:'center', flexWrap: 'wrap'}}>
            <h2>Financeiro</h2>
            
            <div className={styles.filterTabs}>
                <button 
                    className={`${styles.tab} ${filterStatus === 'all' ? styles.tabActive : ''}`}
                    onClick={() => setFilterStatus('all')}
                >
                    Todas
                </button>
                <button 
                    className={`${styles.tab} ${filterStatus === 'pending' ? styles.tabActive : ''}`}
                    onClick={() => setFilterStatus('pending')}
                >
                    A Pagar / Receber
                </button>
                <button 
                    className={`${styles.tab} ${filterStatus === 'completed' ? styles.tabActive : ''}`}
                    onClick={() => setFilterStatus('completed')}
                >
                    Concluídas
                </button>
            </div>

            {/* Novo Filtro de Categoria na Listagem */}
            <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', minWidth: '150px'}}
            >
                <option value="all">Todas as Categorias</option>
                {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
            </select>

        </div>

        <button onClick={() => setIsModalOpen(true)} className={styles.btnNew}>
          <Plus size={18} /> Nova Transação
        </button>
      </div>

      <div className={styles.container}>
        
        {/* CARDS DE RESUMO TOTAIS */}
        {totals && (
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'1rem', marginBottom:'1.5rem'}}>
                <div style={{background:'white', padding:'1rem', borderRadius:'8px', border:'1px solid #e5e7eb'}}>
                    <span style={{color:'#6b7280', fontSize:'0.85rem'}}>Total Realizado (Entradas)</span>
                    <h3 style={{color:'#16a34a', margin:0}}>{formatCurrency(totals.total_income)}</h3>
                </div>
                <div style={{background:'white', padding:'1rem', borderRadius:'8px', border:'1px solid #e5e7eb'}}>
                    <span style={{color:'#6b7280', fontSize:'0.85rem'}}>Total Realizado (Saídas)</span>
                    <h3 style={{color:'#dc2626', margin:0}}>{formatCurrency(totals.total_expense)}</h3>
                </div>
                <div style={{background:'white', padding:'1rem', borderRadius:'8px', border:'1px solid #bae6fd', borderLeft:'4px solid #3b82f6'}}>
                    <span style={{color:'#6b7280', fontSize:'0.85rem'}}>Apenas Neste Mês (Entradas)</span>
                    <h3 style={{color:'#16a34a', margin:0}}>{formatCurrency(totals.monthly_income)}</h3>
                </div>
                <div style={{background:'white', padding:'1rem', borderRadius:'8px', border:'1px solid #bae6fd', borderLeft:'4px solid #3b82f6'}}>
                    <span style={{color:'#6b7280', fontSize:'0.85rem'}}>Apenas Neste Mês (Saídas)</span>
                    <h3 style={{color:'#dc2626', margin:0}}>{formatCurrency(totals.monthly_expense)}</h3>
                </div>
            </div>
        )}

        {loading ? (
          <div style={{padding: '3rem', textAlign: 'center', color: '#6b7280'}}>Carregando...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{width: '50px'}}>Status</th>
                <th>Data</th>
                <th>Descrição</th>
                <th>Envolvido</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Tipo</th>
                <th style={{textAlign:'center'}}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} style={{ opacity: t.status === 'pending' ? 1 : 0.7 }}>
                  <td>
                    {t.status === 'pending' ? (
                        <div className={styles.statusPending} title="Pendente">
                            <Clock size={16} />
                        </div>
                    ) : (
                        <div className={styles.statusCompleted} title="Concluído">
                            <Check size={16} />
                        </div>
                    )}
                  </td>
                  <td>{formatDate(t.date)}</td>
                  <td>
                      <div style={{fontWeight: 500, display:'flex', alignItems:'center', gap:'6px'}}>
                          {t.description}
                          {t.attachment_path && (
                              <button 
                                onClick={() => openAttachment(t.attachment_path)} 
                                title="Ver Comprovante Anexado" 
                                style={{border:'none', background:'transparent', cursor:'pointer', color:'#2563eb', display:'flex', alignItems:'center'}}
                              >
                                  <Paperclip size={14} />
                              </button>
                          )}
                      </div>
                  </td>
                  <td style={{color: '#4b5563', fontSize: '0.9rem'}}>{t.client_name || '-'}</td>
                  <td style={{color: '#6b7280', fontSize: '0.85rem'}}>{t.category_name || 'Geral'}</td>
                  <td style={{ fontWeight: 'bold' }}>{formatCurrency(t.amount)}</td>
                  <td>
                    <span className={`${styles.badge} ${t.type === 'income' ? styles.badgeIncome : styles.badgeExpense}`}>
                      {t.type === 'income' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td style={{textAlign:'center'}}>
                    <button 
                        className={`${styles.actionBtn} ${t.status === 'completed' ? styles.actionBtnCompleted : ''}`}
                        onClick={() => toggleStatus(t.id, t.status)}
                        title={t.status === 'pending' ? "Marcar como Pago/Recebido" : "Desfazer (Marcar como Pendente)"}
                    >
                        {t.status === 'pending' ? <Check size={18} /> : <RotateCcw size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                 <tr><td colSpan="8" style={{textAlign: 'center', padding: '3rem', color: '#9ca3af'}}>Nenhuma transação encontrada neste filtro.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Transação">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div>
            <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Descrição</label>
            <input 
              required
              type="text" 
              placeholder="Ex: Servidores AWS"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px'}}
            />
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Cliente / Fornecedor</label>
                <select
                    value={formData.client_id}
                    onChange={e => setFormData({...formData, client_id: e.target.value})}
                    style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px'}}
                >
                    <option value="">-- Selecione (Opcional) --</option>
                    {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.type === 'client' ? 'C' : 'F'})</option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Categoria Manual</label>
                <select
                    value={formData.category_id}
                    onChange={e => setFormData({...formData, category_id: e.target.value, use_ai_category: false})}
                    disabled={formData.use_ai_category}
                    style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', opacity: formData.use_ai_category ? 0.6 : 1}}
                >
                    <option value="">-- Selecione --</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>
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
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Data Vencimento</label>
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
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Situação Inicial</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px'}}
              >
                <option value="completed">Já Pago / Recebido</option>
                <option value="pending">Pendente (Agendar)</option>
              </select>
            </div>
          </div>

          <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>
                  Anexar Comprovante (Imagem ou PDF)
              </label>
              <input 
                type="file" 
                accept="image/*,application/pdf"
                onChange={e => setFile(e.target.files[0])}
                style={{width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', background:'white'}}
              />
              {file && <small style={{color:'#16a34a', display:'block', marginTop:'4px'}}>Arquivo selecionado: {file.name}</small>}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', 
            background: '#f0f9ff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #bae6fd'
          }}>
            <input 
              type="checkbox" 
              id="aiToggle"
              checked={formData.use_ai_category}
              onChange={e => {
                  setFormData({...formData, use_ai_category: e.target.checked});
                  if(e.target.checked) setFormData(prev => ({...prev, category_id: ''}));
              }}
              style={{width: '16px', height: '16px', cursor: 'pointer'}}
            />
            <label htmlFor="aiToggle" style={{fontSize: '0.9rem', cursor: 'pointer', color: '#0369a1'}}>
              <strong>Gemini AI:</strong> Categorizar automaticamente (Desative para usar Categoria Manual)
            </label>
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            style={{
                background: 'var(--primary-color)', color: 'white', border: 'none', padding: '0.8rem',
                borderRadius: '6px', fontWeight: 'bold', marginTop: '0.5rem', cursor: 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'
            }}
          >
            {isSaving ? <><Loader2 className="spin" size={20} /> Processando...</> : 'Salvar Transação'}
          </button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}