import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './Settings.module.css';
import { UserPlus, Trash2, Save, Building, Users, Tags, Plus } from 'lucide-react'; // Import Tags

export default function Settings() {
  const { addToast } = useContext(ToastContext);
  const [activeTab, setActiveTab] = useState('company'); // company | users | categories
  const [loading, setLoading] = useState(true);

  // Estados dos dados
  const [company, setCompany] = useState({ name: '', closing_day: 1 });
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);

  // Modais
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  
  // Forms
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });
  const [newCat, setNewCat] = useState({ name: '', type: 'expense' });

  useEffect(() => {
    loadSettings();
    loadCategories();
  }, []);

  async function loadSettings() {
    try {
      const response = await api.get('/tenant/settings');
      setCompany(response.data.tenant);
      setUsers(response.data.users);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (error) {
      console.error(error);
    }
  }

  // --- HANDLERS EMPRESA ---
  async function handleSaveCompany(e) {
    e.preventDefault();
    try {
      await api.put('/tenant/settings', company);
      addToast({ type: 'success', title: 'Empresa atualizada!' });
    } catch (error) {
      addToast({ type: 'error', title: 'Erro ao salvar.' });
    }
  }

  // --- HANDLERS USUÁRIO ---
  async function handleAddUser(e) {
    e.preventDefault();
    try {
      await api.post('/tenant/users', newUser);
      addToast({ type: 'success', title: 'Usuário adicionado!' });
      setIsUserModalOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      loadSettings();
    } catch (error) {
      addToast({ type: 'error', title: error.response?.data?.message || 'Erro ao criar usuário.' });
    }
  }

  async function handleDeleteUser(id) {
    if (!window.confirm('Tem certeza?')) return;
    try {
      await api.delete(`/tenant/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
      addToast({ type: 'success', title: 'Removido.' });
    } catch (error) {
      addToast({ type: 'error', title: 'Erro ao remover.' });
    }
  }

  // --- HANDLERS CATEGORIA ---
  async function handleAddCat(e) {
    e.preventDefault();
    try {
      await api.post('/categories', newCat);
      addToast({ type: 'success', title: 'Categoria criada!' });
      setIsCatModalOpen(false);
      setNewCat({ name: '', type: 'expense' });
      loadCategories();
    } catch (error) {
      addToast({ type: 'error', title: 'Erro ao criar.' });
    }
  }

  async function handleDeleteCat(id) {
    if(!window.confirm("Deseja excluir esta categoria?")) return;
    try {
        await api.delete(`/categories/${id}`);
        setCategories(categories.filter(c => c.id !== id));
        addToast({ type: 'success', title: 'Categoria removida.' });
    } catch (error) {
        addToast({ type: 'error', title: error.response?.data?.message || 'Erro ao remover.' });
    }
  }

  if (loading) return <DashboardLayout><div>Carregando...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className={styles.container}>
        {/* ABAS */}
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'company' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('company')}
          >
            <Building size={18} style={{verticalAlign: 'middle', marginRight: '5px'}}/>
            Empresa
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'categories' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            <Tags size={18} style={{verticalAlign: 'middle', marginRight: '5px'}}/>
            Categorias
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'users' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={18} style={{verticalAlign: 'middle', marginRight: '5px'}}/>
            Usuários
          </button>
        </div>

        <div className={styles.content}>
          {/* ABA EMPRESA */}
          {activeTab === 'company' && (
            <form onSubmit={handleSaveCompany}>
              <h3 className={styles.sectionTitle}>Dados Gerais</h3>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nome da Empresa</label>
                <input className={styles.input} value={company.name} onChange={e => setCompany({...company, name: e.target.value})} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Dia de Fechamento</label>
                <input type="number" min="1" max="31" className={styles.input} value={company.closing_day} onChange={e => setCompany({...company, closing_day: e.target.value})} required />
              </div>
              <button type="submit" className={styles.btnSave}><Save size={18} style={{verticalAlign:'middle', marginRight:'5px'}}/> Salvar</button>
            </form>
          )}

          {/* ABA CATEGORIAS */}
          {activeTab === 'categories' && (
             <div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
                   <h3 className={styles.sectionTitle}>Plano de Contas</h3>
                   <button className={styles.btnAddUser} onClick={() => setIsCatModalOpen(true)}>
                      <Plus size={18} /> Nova Categoria
                   </button>
                </div>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2rem'}}>
                    {/* Lista Receitas */}
                    <div>
                        <h4 style={{marginBottom:'10px', color:'#166534'}}>Receitas</h4>
                        <ul className={styles.userList}>
                            {categories.filter(c => c.type === 'income').map(cat => (
                                <li key={cat.id} className={styles.userItem}>
                                    <span>{cat.name}</span>
                                    <button onClick={() => handleDeleteCat(cat.id)} className={styles.btnDelete}><Trash2 size={16}/></button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {/* Lista Despesas */}
                    <div>
                        <h4 style={{marginBottom:'10px', color:'#991b1b'}}>Despesas</h4>
                        <ul className={styles.userList}>
                            {categories.filter(c => c.type === 'expense').map(cat => (
                                <li key={cat.id} className={styles.userItem}>
                                    <span>{cat.name}</span>
                                    <button onClick={() => handleDeleteCat(cat.id)} className={styles.btnDelete}><Trash2 size={16}/></button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
             </div>
          )}

          {/* ABA USUÁRIOS */}
          {activeTab === 'users' && (
            <div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
                 <h3 className={styles.sectionTitle}>Equipe</h3>
                 <button className={styles.btnAddUser} onClick={() => setIsUserModalOpen(true)}>
                    <UserPlus size={18} /> Adicionar Usuário
                 </button>
              </div>
              <ul className={styles.userList}>
                {users.map(user => (
                  <li key={user.id} className={styles.userItem}>
                    <div className={styles.userInfo}>
                      <h4>{user.name} {user.role === 'admin' && <span className={styles.roleBadge}>Admin</span>}</h4>
                      <span>{user.email}</span>
                    </div>
                    <button onClick={() => handleDeleteUser(user.id)} className={styles.btnDelete}><Trash2 size={18}/></button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* MODAL USUÁRIO */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Novo Usuário">
        <form onSubmit={handleAddUser} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
           <div><label>Nome</label><input className={styles.input} value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required /></div>
           <div><label>Email</label><input type="email" className={styles.input} value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required /></div>
           <div><label>Senha</label><input type="password" className={styles.input} value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required /></div>
           <div><label>Permissão</label><select className={styles.input} value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}><option value="user">Padrão</option><option value="admin">Admin</option></select></div>
           <button type="submit" className={styles.btnSave}>Criar</button>
        </form>
      </Modal>

      {/* MODAL CATEGORIA */}
      <Modal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} title="Nova Categoria">
        <form onSubmit={handleAddCat} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
           <div><label>Nome da Categoria</label><input className={styles.input} value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} required placeholder="Ex: Combustível" /></div>
           <div><label>Tipo</label><select className={styles.input} value={newCat.type} onChange={e => setNewCat({...newCat, type: e.target.value})}><option value="expense">Despesa</option><option value="income">Receita</option></select></div>
           <button type="submit" className={styles.btnSave}>Salvar</button>
        </form>
      </Modal>

    </DashboardLayout>
  );
}