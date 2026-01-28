import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './Clients.module.css';
import { Plus, Search, User, Phone, Mail, Trash2, Edit } from 'lucide-react';

export default function Clients() {
  const { addToast } = useContext(ToastContext);
  
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', document: '', address: '', type: 'client'
  });

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erro ao carregar clientes' });
    } finally {
      setLoading(false);
    }
  }

  function openModal(client = null) {
    if (client) {
        setEditingId(client.id);
        setFormData({ ...client });
    } else {
        setEditingId(null);
        setFormData({ name: '', email: '', phone: '', document: '', address: '', type: 'client' });
    }
    setIsModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      if (editingId) {
          await api.put(`/clients/${editingId}`, formData);
          addToast({ type: 'success', title: 'Cliente atualizado!' });
      } else {
          await api.post('/clients', formData);
          addToast({ type: 'success', title: 'Cliente cadastrado!' });
      }
      setIsModalOpen(false);
      loadClients();
    } catch (error) {
      addToast({ type: 'error', title: 'Erro ao salvar.' });
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Deseja remover este cadastro?")) return;
    try {
        await api.delete(`/clients/${id}`);
        setClients(clients.filter(c => c.id !== id));
        addToast({ type: 'success', title: 'Removido com sucesso.' });
    } catch (error) {
        addToast({ type: 'error', title: 'Erro ao remover.' });
    }
  }

  const filtered = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
            <div className={styles.title}>
                <h2>Clientes e Fornecedores</h2>
                <p>Gerencie sua base de contatos</p>
            </div>
            <div className={styles.actions}>
                <div style={{position:'relative'}}>
                    <Search size={18} style={{position:'absolute', left:'10px', top:'10px', color:'#9ca3af'}}/>
                    <input 
                        className={styles.searchInput} 
                        placeholder="Buscar por nome ou email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{paddingLeft: '2.2rem'}}
                    />
                </div>
                <button className={styles.btnNew} onClick={() => openModal()}>
                    <Plus size={18} /> Novo Contato
                </button>
            </div>
        </div>

        {loading ? <p>Carregando...</p> : (
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th style={{width:'50px'}}></th>
                        <th>Nome / Documento</th>
                        <th>Contato</th>
                        <th>Tipo</th>
                        <th style={{textAlign:'right'}}>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map(c => (
                        <tr key={c.id}>
                            <td>
                                <div className={styles.avatar}>
                                    {c.name.charAt(0).toUpperCase()}
                                </div>
                            </td>
                            <td>
                                <div style={{fontWeight:600}}>{c.name}</div>
                                <div style={{fontSize:'0.8rem', color:'#9ca3af'}}>{c.document || 'Sem documento'}</div>
                            </td>
                            <td>
                                {c.email && <div style={{display:'flex', gap:'5px', fontSize:'0.85rem', marginBottom:'2px'}}><Mail size={14}/> {c.email}</div>}
                                {c.phone && <div style={{display:'flex', gap:'5px', fontSize:'0.85rem'}}><Phone size={14}/> {c.phone}</div>}
                            </td>
                            <td>
                                <span className={`${styles.badge} ${c.type === 'client' ? styles.badgeClient : styles.badgeSupplier}`}>
                                    {c.type === 'client' ? 'Cliente' : c.type === 'supplier' ? 'Fornecedor' : 'Ambos'}
                                </span>
                            </td>
                            <td style={{textAlign:'right'}}>
                                <button className={styles.btnAction} onClick={() => openModal(c)} title="Editar">
                                    <Edit size={18} />
                                </button>
                                <button className={`${styles.btnAction} ${styles.btnDelete}`} onClick={() => handleDelete(c.id)} title="Excluir">
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {filtered.length === 0 && <tr><td colSpan="5" style={{textAlign:'center', color:'#9ca3af'}}>Nenhum contato encontrado.</td></tr>}
                </tbody>
            </table>
        )}

        {/* MODAL */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Contato" : "Novo Contato"}>
            <form onSubmit={handleSave}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Nome Completo / Razão Social</label>
                    <input className={styles.input} required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Email</label>
                        <input className={styles.input} type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Telefone / WhatsApp</label>
                        <input className={styles.input} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                </div>

                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>CPF / CNPJ</label>
                        <input className={styles.input} value={formData.document} onChange={e => setFormData({...formData, document: e.target.value})} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Tipo de Cadastro</label>
                        <select className={styles.select} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                            <option value="client">Cliente</option>
                            <option value="supplier">Fornecedor</option>
                            <option value="both">Ambos</option>
                        </select>
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Endereço Completo</label>
                    <input className={styles.input} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>

                <button type="submit" className={styles.btnSave}>Salvar Contato</button>
            </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}