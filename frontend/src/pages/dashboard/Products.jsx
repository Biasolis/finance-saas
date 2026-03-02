import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './Products.module.css';
import { Plus, Search, Package, AlertTriangle, Edit, Trash2 } from 'lucide-react';

export default function Products() {
  const { addToast } = useContext(ToastContext);
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', sale_price: '', cost_price: '', stock: '', min_stock: ''
  });

  useEffect(() => {
    loadProducts();
  }, [showLowStockOnly]);

  async function loadProducts() {
    try {
      let url = '/products';
      if (showLowStockOnly) url += '?low_stock=true';
      
      const response = await api.get(url);
      setProducts(response.data);
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erro ao carregar estoque' });
    } finally {
      setLoading(false);
    }
  }

  function openModal(product = null) {
    if (product) {
        setEditingId(product.id);
        setFormData({ ...product });
    } else {
        setEditingId(null);
        setFormData({ name: '', description: '', sale_price: '', cost_price: '', stock: '0', min_stock: '5' });
    }
    setIsModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      const payload = {
          ...formData,
          sale_price: parseFloat(formData.sale_price),
          cost_price: parseFloat(formData.cost_price),
          stock: parseInt(formData.stock),
          min_stock: parseInt(formData.min_stock)
      };

      if (editingId) {
          await api.put(`/products/${editingId}`, payload);
          addToast({ type: 'success', title: 'Produto atualizado!' });
      } else {
          await api.post('/products', payload);
          addToast({ type: 'success', title: 'Produto cadastrado!' });
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (error) {
      addToast({ type: 'error', title: 'Erro ao salvar.' });
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Remover este produto do estoque?")) return;
    try {
        await api.delete(`/products/${id}`);
        setProducts(products.filter(p => p.id !== id));
        addToast({ type: 'success', title: 'Removido com sucesso.' });
    } catch (error) {
        addToast({ type: 'error', title: 'Erro ao remover.' });
    }
  }

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
            <div className={styles.title}>
                <h2>Controle de Estoque</h2>
                <p>Gerencie produtos, peças e valores.</p>
            </div>
            <div className={styles.actions}>
                <div style={{display:'flex', alignItems:'center', gap:'0.5rem', marginRight:'1rem'}}>
                    <input 
                        type="checkbox" 
                        id="lowStock" 
                        checked={showLowStockOnly} 
                        onChange={e => setShowLowStockOnly(e.target.checked)} 
                        style={{cursor:'pointer'}}
                    />
                    <label htmlFor="lowStock" style={{cursor:'pointer', fontSize:'0.9rem', color: showLowStockOnly ? '#dc2626' : '#374151', fontWeight: showLowStockOnly ? 'bold' : 'normal'}}>
                        Apenas Estoque Baixo
                    </label>
                </div>

                <div style={{position:'relative'}}>
                    <Search size={18} style={{position:'absolute', left:'10px', top:'10px', color:'#9ca3af'}}/>
                    <input 
                        className={styles.searchInput} 
                        placeholder="Buscar produto..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{paddingLeft: '2.2rem'}}
                    />
                </div>
                <button className={styles.btnNew} onClick={() => openModal()}>
                    <Plus size={18} /> Novo Produto
                </button>
            </div>
        </div>

        {loading ? <p>Carregando...</p> : (
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th>Preço Venda</th>
                        <th>Preço Custo</th>
                        <th>Estoque</th>
                        <th style={{textAlign:'right'}}>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map(p => (
                        <tr key={p.id}>
                            <td>
                                <div style={{fontWeight:600, display:'flex', alignItems:'center', gap:'8px'}}>
                                    <Package size={18} color="#4b5563"/> {p.name}
                                </div>
                                {p.description && <div style={{fontSize:'0.8rem', color:'#9ca3af', marginLeft:'26px'}}>{p.description}</div>}
                            </td>
                            <td className={styles.price} style={{color:'#166534'}}>{formatCurrency(p.sale_price)}</td>
                            <td className={styles.price} style={{color:'#6b7280'}}>{formatCurrency(p.cost_price)}</td>
                            <td>
                                <span className={`${styles.stockBadge} ${p.stock <= p.min_stock ? styles.stockLow : styles.stockOk}`}>
                                    {p.stock} un.
                                    {p.stock <= p.min_stock && <AlertTriangle size={12} style={{marginLeft:'4px', verticalAlign:'middle'}}/>}
                                </span>
                            </td>
                            <td style={{textAlign:'right'}}>
                                <button className={styles.btnAction} onClick={() => openModal(p)} title="Editar">
                                    <Edit size={18} />
                                </button>
                                <button className={`${styles.btnAction} ${styles.btnDelete}`} onClick={() => handleDelete(p.id)} title="Excluir">
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {filtered.length === 0 && <tr><td colSpan="5" style={{textAlign:'center', color:'#9ca3af'}}>Nenhum produto encontrado.</td></tr>}
                </tbody>
            </table>
        )}

        {/* MODAL */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Produto" : "Novo Produto"}>
            <form onSubmit={handleSave}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Nome do Produto / Peça</label>
                    <input className={styles.input} required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Tela iPhone 11" />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Descrição (Opcional)</label>
                    <input className={styles.input} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Preço de Venda (R$)</label>
                        <input className={styles.input} type="number" step="0.01" required value={formData.sale_price} onChange={e => setFormData({...formData, sale_price: e.target.value})} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Preço de Custo (R$)</label>
                        <input className={styles.input} type="number" step="0.01" required value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} />
                    </div>
                </div>

                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Estoque Atual</label>
                        <input className={styles.input} type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Estoque Mínimo (Alerta)</label>
                        <input className={styles.input} type="number" required value={formData.min_stock} onChange={e => setFormData({...formData, min_stock: e.target.value})} />
                    </div>
                </div>

                <button type="submit" className={styles.btnSave}>Salvar Produto</button>
            </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}