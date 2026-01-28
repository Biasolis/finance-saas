import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './ServiceOrders.module.css';
import { Plus, Search, Monitor, Trash2, Printer, FileText, CheckCircle } from 'lucide-react'; // Import CheckCircle

export default function ServiceOrders() {
  const { addToast } = useContext(ToastContext);
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    client_name: '', equipment: '', description: '', priority: 'normal', price: ''
  });

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const response = await api.get('/service-orders');
      setOrders(response.data);
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erro ao carregar OS' });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.post('/service-orders', {
        ...newOrder,
        price: parseFloat(newOrder.price || 0)
      });
      addToast({ type: 'success', title: 'OS Aberta com sucesso!' });
      setIsModalOpen(false);
      setNewOrder({ client_name: '', equipment: '', description: '', priority: 'normal', price: '' });
      loadOrders();
    } catch (error) {
      addToast({ type: 'error', title: 'Erro ao criar OS.' });
    }
  }

  async function handleStatusChange(id, newStatus) {
    const oldOrders = [...orders];
    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));

    try {
      await api.patch(`/service-orders/${id}/status`, { status: newStatus });
      addToast({ type: 'success', title: 'Status atualizado' });
    } catch (error) {
      setOrders(oldOrders);
      addToast({ type: 'error', title: 'Erro ao atualizar' });
    }
  }

  // NOVA FUNÇÃO: FATURAR
  async function handleBill(id, price) {
      if(!window.confirm(`Deseja finalizar esta OS e lançar R$ ${price} no caixa?`)) return;
      
      try {
          await api.post(`/service-orders/${id}/bill`);
          addToast({ type: 'success', title: 'OS Finalizada e Faturada!' });
          loadOrders(); // Recarrega para ver status 'completed'
      } catch (error) {
          addToast({ type: 'error', title: 'Erro ao faturar.' });
      }
  }

  async function handleDelete(id) {
    if(!window.confirm("Deseja realmente excluir esta OS?")) return;
    try {
        await api.delete(`/service-orders/${id}`);
        setOrders(orders.filter(o => o.id !== id));
        addToast({ type: 'success', title: 'OS removida' });
    } catch (error) {
        addToast({ type: 'error', title: 'Erro ao remover' });
    }
  }

  const handlePrint = (id, type) => {
      const url = `/print/os/${id}?format=${type}`;
      window.open(url, '_blank', 'width=800,height=600');
  };

  const filteredOrders = orders.filter(o => 
    o.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.equipment.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const statusOptions = [
      { value: 'open', label: 'Aberto' },
      { value: 'in_progress', label: 'Em Andamento' },
      { value: 'waiting', label: 'Aguardando Peça' },
      { value: 'completed', label: 'Concluído' }
  ];

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
            <div className={styles.title}>
                <h2>Ordens de Serviço</h2>
                <p>Gerencie manutenções e serviços técnicos</p>
            </div>
            <div className={styles.actions}>
                <div style={{position:'relative'}}>
                    <Search size={18} style={{position:'absolute', left:'10px', top:'10px', color:'#9ca3af'}}/>
                    <input 
                        className={styles.searchInput} 
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{paddingLeft: '2.2rem'}}
                    />
                </div>
                <button className={styles.btnNew} onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} /> Nova OS
                </button>
            </div>
        </div>

        {loading ? <p>Carregando...</p> : (
            <div className={styles.grid}>
                {filteredOrders.map(os => (
                    <div key={os.id} className={styles.card} style={{borderColor: os.status === 'completed' ? '#86efac' : '#e5e7eb'}}>
                        <div className={styles.cardHeader}>
                            <div>
                                <div className={styles.clientName}>{os.client_name}</div>
                                <div className={styles.equipment}>
                                    <Monitor size={14} /> {os.equipment}
                                </div>
                            </div>
                            {/* Priority Badge */}
                            <span className={`${styles.priorityBadge} ${os.priority === 'high' ? styles.p_high : styles.p_normal}`}>
                                {os.priority === 'high' ? 'Alta' : 'Normal'}
                            </span>
                        </div>

                        <div className={styles.description}>
                            {os.description || 'Sem descrição.'}
                        </div>

                        {/* BOTÕES DE AÇÃO */}
                        <div style={{display:'flex', gap:'10px', marginTop:'10px', paddingBottom:'10px', borderBottom:'1px solid #f3f4f6'}}>
                             <button onClick={() => handlePrint(os.id, 'a4')} title="Imprimir A4" style={{cursor:'pointer', border:'1px solid #ddd', background:'white', padding:'5px', borderRadius:'4px'}}>
                                <FileText size={16} color="#4b5563"/>
                             </button>
                             <button onClick={() => handlePrint(os.id, 'thermal')} title="Imprimir Cupom" style={{cursor:'pointer', border:'1px solid #ddd', background:'white', padding:'5px', borderRadius:'4px'}}>
                                <Printer size={16} color="#4b5563"/>
                             </button>
                             
                             {/* BOTÃO FATURAR - Só aparece se não estiver concluído */}
                             {os.status !== 'completed' && (
                                 <button 
                                    onClick={() => handleBill(os.id, os.price)} 
                                    title="Finalizar e Faturar" 
                                    style={{cursor:'pointer', border:'1px solid #16a34a', background:'#dcfce7', color:'#166534', padding:'5px 10px', borderRadius:'4px', display:'flex', alignItems:'center', gap:'5px', fontSize:'0.8rem', fontWeight:'bold'}}
                                 >
                                    <CheckCircle size={16} /> Faturar
                                 </button>
                             )}

                             <div style={{flex:1}}></div>
                             <button onClick={() => handleDelete(os.id)} title="Excluir" style={{cursor:'pointer', border:'none', background:'transparent', color:'#ef4444'}}>
                                <Trash2 size={16} />
                             </button>
                        </div>

                        <div className={styles.footer}>
                            <div className={styles.price}>{formatCurrency(os.price)}</div>
                            <select 
                                className={`${styles.statusSelect} ${styles[`status_${os.status}`]}`}
                                value={os.status}
                                onChange={(e) => handleStatusChange(os.id, e.target.value)}
                                disabled={os.status === 'completed'} // Trava se já concluiu
                            >
                                {statusOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                ))}
                {filteredOrders.length === 0 && <p style={{color:'#9ca3af'}}>Nenhuma OS encontrada.</p>}
            </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Ordem de Serviço">
            <form onSubmit={handleCreate}>
                {/* Form Igual Anterior */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>Nome do Cliente</label>
                    <input className={styles.input} required value={newOrder.client_name} onChange={e => setNewOrder({...newOrder, client_name: e.target.value})} placeholder="Ex: João da Silva" />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Equipamento / Serviço</label>
                    <input className={styles.input} required value={newOrder.equipment} onChange={e => setNewOrder({...newOrder, equipment: e.target.value})} placeholder="Ex: Notebook Dell..." />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Prioridade</label>
                    <select className={styles.select} value={newOrder.priority} onChange={e => setNewOrder({...newOrder, priority: e.target.value})}>
                        <option value="low">Baixa</option>
                        <option value="normal">Normal</option>
                        <option value="high">Alta</option>
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Valor Previsto (R$)</label>
                    <input className={styles.input} type="number" step="0.01" value={newOrder.price} onChange={e => setNewOrder({...newOrder, price: e.target.value})} placeholder="0.00" />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Descrição do Problema</label>
                    <textarea className={styles.textarea} rows="3" value={newOrder.description} onChange={e => setNewOrder({...newOrder, description: e.target.value})} />
                </div>
                <button type="submit" className={styles.btnSave}>Abrir OS</button>
            </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}