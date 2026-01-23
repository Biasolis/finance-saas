import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import styles from './AdminDashboard.module.css';
import { useNavigate } from 'react-router-dom';
import { Shield, LogIn, Settings } from 'lucide-react';
import Modal from '../../components/ui/Modal'; // Reutilizando nosso modal

export default function AdminDashboard() {
  const { user, signIn } = useContext(AuthContext); // signIn usado para atualizar contexto ao impersonar
  const { addToast } = useContext(ToastContext);
  const navigate = useNavigate();
  
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para edição
  const [editingTenant, setEditingTenant] = useState(null);
  const [formPlan, setFormPlan] = useState({ plan_tier: 'basic', ai_usage_limit: 100, active: true });

  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    try {
      const response = await api.get('/admin/tenants');
      setTenants(response.data);
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erro ao carregar empresas' });
    } finally {
      setLoading(false);
    }
  }

  // AÇÃO MÁGICA: Logar como o cliente
  async function handleImpersonate(tenantId) {
    if(!window.confirm("Você tem certeza que deseja acessar a conta deste cliente?")) return;
    
    try {
      const response = await api.post(`/admin/tenants/${tenantId}/impersonate`);
      const { token, user: impersonatedUser } = response.data;
      
      // Salva token do admin original para poder voltar depois (opcional, mas recomendado)
      localStorage.setItem('superadmin_token_backup', localStorage.getItem('saas_token'));
      
      // Substitui sessão atual
      localStorage.setItem('saas_token', token);
      localStorage.setItem('saas_user', JSON.stringify(impersonatedUser));
      
      // Força reload para o AuthContext pegar a nova sessão
      window.location.href = '/dashboard';
      
    } catch (error) {
      addToast({ type: 'error', title: 'Erro ao acessar conta do cliente' });
    }
  }

  function openEditModal(tenant) {
    setEditingTenant(tenant);
    setFormPlan({
      plan_tier: tenant.plan_tier,
      ai_usage_limit: tenant.ai_usage_limit,
      active: tenant.active
    });
  }

  async function handleSavePlan(e) {
    e.preventDefault();
    try {
      await api.put(`/admin/tenants/${editingTenant.id}/plan`, formPlan);
      addToast({ type: 'success', title: 'Plano atualizado!' });
      setEditingTenant(null);
      loadTenants();
    } catch (error) {
      addToast({ type: 'error', title: 'Erro ao atualizar' });
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
           <Shield size={32} color="#2563eb" />
           <h1 className={styles.title}>Painel Super Admin</h1>
        </div>
        <button onClick={() => navigate('/dashboard')} className={styles.btnEdit} style={{width: 'auto', padding: '0.75rem 1.5rem'}}>
          Voltar ao Meu Dashboard
        </button>
      </header>

      {loading ? <p>Carregando império...</p> : (
        <div className={styles.grid}>
          {tenants.map(tenant => (
            <div key={tenant.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.companyName}>{tenant.name}</h3>
                  <small style={{color: '#6b7280'}}>{tenant.slug}</small>
                </div>
                <div className={styles.badges}>
                   <span className={`${styles.badge} ${tenant.active ? styles.active : styles.inactive}`}>
                     {tenant.active ? 'Ativo' : 'Inativo'}
                   </span>
                   <span className={styles.badge} style={{background: '#f3f4f6', color: '#374151'}}>
                     {tenant.plan_tier}
                   </span>
                </div>
              </div>

              <div className={styles.stats}>
                <div className={styles.statItem}>
                  <span>Usuários</span>
                  <strong>{tenant.user_count}</strong>
                </div>
                <div className={styles.statItem}>
                  <span>Transações</span>
                  <strong>{tenant.transaction_count}</strong>
                </div>
                <div className={styles.statItem}>
                  <span>Uso IA</span>
                  <strong>{tenant.ai_usage_current} / {tenant.ai_usage_limit}</strong>
                </div>
              </div>

              <div className={styles.actions}>
                <button onClick={() => handleImpersonate(tenant.id)} className={`${styles.btn} ${styles.btnAccess}`}>
                  <LogIn size={16} style={{marginRight: '5px', verticalAlign: 'middle'}}/>
                  Acessar Painel
                </button>
                <button onClick={() => openEditModal(tenant)} className={`${styles.btn} ${styles.btnEdit}`}>
                  <Settings size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Edição de Plano */}
      <Modal isOpen={!!editingTenant} onClose={() => setEditingTenant(null)} title={`Editar: ${editingTenant?.name}`}>
        <form onSubmit={handleSavePlan} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 600}}>Plano</label>
              <select 
                value={formPlan.plan_tier}
                onChange={e => setFormPlan({...formPlan, plan_tier: e.target.value})}
                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc'}}
              >
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 600}}>Limite de IA (Requisições)</label>
              <input 
                type="number"
                value={formPlan.ai_usage_limit}
                onChange={e => setFormPlan({...formPlan, ai_usage_limit: e.target.value})}
                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc'}}
              />
            </div>

            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
               <input 
                 type="checkbox"
                 checked={formPlan.active}
                 onChange={e => setFormPlan({...formPlan, active: e.target.checked})}
                 style={{width: '20px', height: '20px'}}
               />
               <label>Empresa Ativa (Acesso liberado)</label>
            </div>

            <button type="submit" style={{
                background: '#2563eb', color: 'white', border: 'none', padding: '1rem', 
                borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem'
            }}>
                Salvar Alterações
            </button>
        </form>
      </Modal>

    </div>
  );
}