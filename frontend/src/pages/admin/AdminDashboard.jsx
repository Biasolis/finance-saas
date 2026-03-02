import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import styles from './AdminDashboard.module.css';
import { useNavigate } from 'react-router-dom';
import { Shield, LogIn, Settings, Plus, Trash2, Search, Activity, Users, Database, UserPlus, UserMinus, CreditCard, Edit } from 'lucide-react';
import Modal from '../../components/ui/Modal';

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const { addToast } = useContext(ToastContext);
  const navigate = useNavigate();
  
  // Tabs: 'tenants' | 'admins' | 'plans'
  const [activeTab, setActiveTab] = useState('tenants');

  const [tenants, setTenants] = useState([]);
  const [superAdmins, setSuperAdmins] = useState([]);
  const [plans, setPlans] = useState([]); // Lista de planos
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modais
  const [editingTenant, setEditingTenant] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  
  // Modal Planos
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null); // Se null, é create

  // Forms
  const [formPlan, setFormPlan] = useState({ plan_tier: 'basic', ai_usage_limit: 100, active: true, max_users: 5 });
  const [newTenant, setNewTenant] = useState({ companyName: '', slug: '', name: '', email: '', password: '', plan_tier: 'Start' });
  const [newAdminEmail, setNewAdminEmail] = useState('');
  
  // Form do Plano (CRUD)
  const [planFormData, setPlanFormData] = useState({ name: '', max_users: 5, ai_usage_limit: 100, price: 0, active: true });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [tenantsRes, statsRes, adminsRes, plansRes] = await Promise.all([
        api.get('/admin/tenants'),
        api.get('/admin/stats'),
        api.get('/admin/admins'),
        api.get('/admin/plans')
      ]);
      setTenants(tenantsRes.data);
      setStats(statsRes.data);
      setSuperAdmins(adminsRes.data);
      setPlans(plansRes.data);
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erro ao carregar dados' });
    } finally {
      setLoading(false);
    }
  }

  // --- ACTIONS TENANTS ---

  async function handleImpersonate(tenantId) {
    if(!window.confirm("Acessar a conta deste cliente?")) return;
    try {
      const response = await api.post(`/admin/tenants/${tenantId}/impersonate`);
      const { token, user: impersonatedUser } = response.data;
      localStorage.setItem('superadmin_token_backup', localStorage.getItem('saas_token'));
      localStorage.setItem('saas_token', token);
      localStorage.setItem('saas_user', JSON.stringify(impersonatedUser));
      window.location.href = '/dashboard';
    } catch (error) {
      addToast({ type: 'error', title: 'Erro ao acessar conta' });
    }
  }

  async function handleCreateTenant(e) {
    e.preventDefault();
    try {
      // Aplica limites do plano escolhido automaticamente se não vier do backend (lógica extra de segurança)
      const selectedPlan = plans.find(p => p.name === newTenant.plan_tier);
      // Aqui enviamos apenas o nome do plano (plan_tier), o backend ou a lógica de negócio cuidará do resto
      // Mas para garantir consistência inicial, poderíamos mandar os limites. 
      // Por enquanto, o backend cria com 'basic' hardcoded ou o que passamos.
      // Vamos manter simples: o backend cria, depois ajustamos se precisar.
      
      await api.post('/admin/tenants', newTenant);
      addToast({ type: 'success', title: 'Empresa criada com sucesso!' });
      setIsCreateModalOpen(false);
      setNewTenant({ companyName: '', slug: '', name: '', email: '', password: '', plan_tier: 'Start' });
      loadData();
    } catch (error) {
      addToast({ type: 'error', title: error.response?.data?.message || 'Erro ao criar' });
    }
  }

  async function handleDeleteTenant(id) {
    if(!window.confirm("ATENÇÃO: Isso apagará TODOS os dados desta empresa permanentemente. Continuar?")) return;
    try {
      await api.delete(`/admin/tenants/${id}`);
      addToast({ type: 'success', title: 'Empresa removida.' });
      loadData();
    } catch (error) {
      addToast({ type: 'error', title: 'Erro ao deletar.' });
    }
  }

  function openEditModal(tenant) {
    setEditingTenant(tenant);
    setFormPlan({
      plan_tier: tenant.plan_tier,
      ai_usage_limit: tenant.ai_usage_limit,
      active: tenant.active,
      max_users: tenant.max_users || 5
    });
  }

  // Função Inteligente: Ao mudar o select do plano, auto-preenche os limites
  function handlePlanChange(e) {
      const selectedName = e.target.value;
      const template = plans.find(p => p.name === selectedName);
      
      if (template) {
          setFormPlan({
              ...formPlan,
              plan_tier: selectedName,
              ai_usage_limit: template.ai_usage_limit,
              max_users: template.max_users
          });
      } else {
          setFormPlan({ ...formPlan, plan_tier: selectedName });
      }
  }

  async function handleSavePlan(e) {
    e.preventDefault();
    try {
      await api.put(`/admin/tenants/${editingTenant.id}/plan`, formPlan);
      addToast({ type: 'success', title: 'Configurações atualizadas!' });
      setEditingTenant(null);
      loadData();
    } catch (error) {
      addToast({ type: 'error', title: 'Erro ao atualizar' });
    }
  }

  // --- ACTIONS SUPER ADMINS ---

  async function handleAddSuperAdmin(e) {
      e.preventDefault();
      try {
          await api.post('/admin/admins', { email: newAdminEmail });
          addToast({ type: 'success', title: 'Admin adicionado!' });
          setNewAdminEmail('');
          setIsAddAdminModalOpen(false);
          loadData();
      } catch (error) {
          addToast({ type: 'error', title: 'Erro ao adicionar.' });
      }
  }

  async function handleRemoveSuperAdmin(userId) {
      if(!window.confirm("Remover privilégios?")) return;
      try {
          await api.delete(`/admin/admins/${userId}`);
          addToast({ type: 'success', title: 'Privilégios removidos.' });
          loadData();
      } catch (error) {
          addToast({ type: 'error', title: 'Erro ao remover.' });
      }
  }

  // --- ACTIONS PLANS (CRUD) ---

  function openPlanModal(plan = null) {
      if (plan) {
          setEditingPlan(plan);
          setPlanFormData({ ...plan });
      } else {
          setEditingPlan(null);
          setPlanFormData({ name: '', max_users: 5, ai_usage_limit: 100, price: 0, active: true });
      }
      setIsPlanModalOpen(true);
  }

  async function handleSavePlanTemplate(e) {
      e.preventDefault();
      try {
          if (editingPlan) {
              await api.put(`/admin/plans/${editingPlan.id}`, planFormData);
              addToast({ type: 'success', title: 'Plano atualizado' });
          } else {
              await api.post('/admin/plans', planFormData);
              addToast({ type: 'success', title: 'Plano criado' });
          }
          setIsPlanModalOpen(false);
          loadData();
      } catch (error) {
          addToast({ type: 'error', title: 'Erro ao salvar plano' });
      }
  }

  async function handleDeletePlan(id) {
      if(!window.confirm("Excluir este modelo de plano?")) return;
      try {
          await api.delete(`/admin/plans/${id}`);
          addToast({ type: 'success', title: 'Plano removido' });
          loadData();
      } catch (error) {
          addToast({ type: 'error', title: 'Erro ao remover' });
      }
  }

  // Filter
  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
           <Shield size={32} color="#2563eb" />
           <h1 className={styles.title}>Central de Comando</h1>
        </div>
        <button onClick={() => navigate('/dashboard')} className={styles.btnEdit} style={{width: 'auto', padding: '0.75rem 1.5rem'}}>
          Voltar ao App
        </button>
      </header>

      {/* KPI STATS */}
      {stats && (
        <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
                <div className={styles.kpiTitle}>Total de Empresas</div>
                <div className={styles.kpiValue} style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <Shield size={24} color="#6b7280"/> {stats.total_tenants}
                </div>
            </div>
            <div className={styles.kpiCard}>
                <div className={styles.kpiTitle}>Empresas Ativas</div>
                <div className={styles.kpiValue} style={{color: '#10b981', display:'flex', alignItems:'center', gap:'10px'}}>
                    <Activity size={24} /> {stats.active_tenants}
                </div>
            </div>
            <div className={styles.kpiCard}>
                <div className={styles.kpiTitle}>Usuários Totais</div>
                <div className={styles.kpiValue} style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <Users size={24} color="#6b7280"/> {stats.total_users}
                </div>
            </div>
            <div className={styles.kpiCard}>
                <div className={styles.kpiTitle}>Volume Transações</div>
                <div className={styles.kpiValue} style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <Database size={24} color="#6b7280"/> {stats.total_transactions}
                </div>
            </div>
        </div>
      )}

      {/* TABS */}
      <div style={{display:'flex', gap:'10px', marginBottom:'1.5rem', borderBottom:'1px solid #e5e7eb'}}>
          <button 
            onClick={() => setActiveTab('tenants')}
            style={{
                padding:'10px 20px', border:'none', background: activeTab === 'tenants' ? 'white' : 'transparent',
                borderBottom: activeTab === 'tenants' ? '3px solid #2563eb' : 'none', fontWeight:'bold', cursor:'pointer'
            }}
          >
              Gerenciar Empresas
          </button>
          <button 
            onClick={() => setActiveTab('plans')}
            style={{
                padding:'10px 20px', border:'none', background: activeTab === 'plans' ? 'white' : 'transparent',
                borderBottom: activeTab === 'plans' ? '3px solid #2563eb' : 'none', fontWeight:'bold', cursor:'pointer'
            }}
          >
              Planos & Preços
          </button>
          <button 
            onClick={() => setActiveTab('admins')}
            style={{
                padding:'10px 20px', border:'none', background: activeTab === 'admins' ? 'white' : 'transparent',
                borderBottom: activeTab === 'admins' ? '3px solid #2563eb' : 'none', fontWeight:'bold', cursor:'pointer'
            }}
          >
              Super Administradores
          </button>
      </div>

      {activeTab === 'tenants' && (
          <>
            <div className={styles.controls}>
                <div style={{position:'relative', flex:1, maxWidth:'400px'}}>
                    <Search size={18} style={{position:'absolute', left:'10px', top:'10px', color:'#9ca3af'}} />
                    <input 
                        className={styles.searchBar} 
                        placeholder="Buscar empresa..."
                        style={{paddingLeft:'2.2rem'}}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className={styles.btnAdd} onClick={() => setIsCreateModalOpen(true)}>
                    <Plus size={18} /> Nova Empresa
                </button>
            </div>

            {loading ? <p>Carregando...</p> : (
                <div className={styles.grid}>
                {filteredTenants.map(tenant => (
                    <div key={tenant.id} className={styles.card} style={{opacity: tenant.active ? 1 : 0.7}}>
                    <div className={styles.cardHeader}>
                        <div>
                        <h3 className={styles.companyName}>{tenant.name}</h3>
                        <small style={{color: '#6b7280'}}>@{tenant.slug}</small>
                        </div>
                        <div className={styles.badges}>
                        <span className={`${styles.badge} ${tenant.active ? styles.active : styles.inactive}`}>
                            {tenant.active ? 'Ativo' : 'Bloqueado'}
                        </span>
                        <span className={styles.badge} style={{background: '#f3f4f6', color: '#374151'}}>
                            {tenant.plan_tier}
                        </span>
                        </div>
                    </div>

                    <div className={styles.stats}>
                        <div className={styles.statItem}>
                        <span>Usuários</span>
                        <strong>{tenant.user_count} / {tenant.max_users || '∞'}</strong>
                        </div>
                        <div className={styles.statItem}>
                        <span>Transações</span>
                        <strong>{tenant.transaction_count}</strong>
                        </div>
                        <div className={styles.statItem}>
                        <span>Uso IA</span>
                        <strong>{tenant.ai_usage_current}/{tenant.ai_usage_limit}</strong>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button onClick={() => handleImpersonate(tenant.id)} className={`${styles.btn} ${styles.btnAccess}`} title="Acessar Painel">
                        <LogIn size={16} style={{marginRight: '5px', verticalAlign: 'middle'}}/> Acessar
                        </button>
                        <button onClick={() => openEditModal(tenant)} className={`${styles.btn} ${styles.btnEdit}`} title="Configurar Limites">
                        <Settings size={16} />
                        </button>
                        <button onClick={() => handleDeleteTenant(tenant.id)} className={`${styles.btn} ${styles.btnDelete}`} title="Excluir">
                        <Trash2 size={16} />
                        </button>
                    </div>
                    </div>
                ))}
                </div>
            )}
          </>
      )}

      {activeTab === 'plans' && (
          <div style={{background:'white', padding:'2rem', borderRadius:'8px', boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1.5rem'}}>
                  <h3>Gerenciar Modelos de Planos</h3>
                  <button className={styles.btnAdd} onClick={() => openPlanModal()}>
                      <Plus size={18} /> Novo Plano
                  </button>
              </div>
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                  <thead>
                      <tr style={{textAlign:'left', borderBottom:'2px solid #f3f4f6'}}>
                          <th style={{padding:'10px'}}>Nome</th>
                          <th style={{padding:'10px'}}>Preço (R$)</th>
                          <th style={{padding:'10px'}}>Usuários Max</th>
                          <th style={{padding:'10px'}}>Limite IA</th>
                          <th style={{padding:'10px'}}>Status</th>
                          <th style={{padding:'10px', textAlign:'right'}}>Ações</th>
                      </tr>
                  </thead>
                  <tbody>
                      {plans.map(plan => (
                          <tr key={plan.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                              <td style={{padding:'10px', fontWeight:'bold'}}>{plan.name}</td>
                              <td style={{padding:'10px'}}>{plan.price}</td>
                              <td style={{padding:'10px'}}>{plan.max_users}</td>
                              <td style={{padding:'10px'}}>{plan.ai_usage_limit}</td>
                              <td style={{padding:'10px'}}>
                                  <span style={{padding:'2px 8px', borderRadius:'99px', fontSize:'0.75rem', background: plan.active ? '#dcfce7' : '#fee2e2', color: plan.active ? '#166534' : '#991b1b'}}>
                                      {plan.active ? 'Ativo' : 'Inativo'}
                                  </span>
                              </td>
                              <td style={{padding:'10px', textAlign:'right'}}>
                                  <button onClick={() => openPlanModal(plan)} style={{border:'none', background:'transparent', color:'#2563eb', cursor:'pointer', marginRight:'10px'}}>
                                      <Edit size={18} />
                                  </button>
                                  <button onClick={() => handleDeletePlan(plan.id)} style={{border:'none', background:'transparent', color:'#dc2626', cursor:'pointer'}}>
                                      <Trash2 size={18} />
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {activeTab === 'admins' && (
          <div style={{background:'white', padding:'2rem', borderRadius:'8px', boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1.5rem'}}>
                  <h3>Equipe Super Admin</h3>
                  <button className={styles.btnAdd} onClick={() => setIsAddAdminModalOpen(true)}>
                      <UserPlus size={18} /> Adicionar Admin
                  </button>
              </div>
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                  <thead>
                      <tr style={{textAlign:'left', borderBottom:'2px solid #f3f4f6'}}>
                          <th style={{padding:'10px'}}>Nome</th>
                          <th style={{padding:'10px'}}>Email</th>
                          <th style={{padding:'10px'}}>Empresa Origem</th>
                          <th style={{padding:'10px', textAlign:'right'}}>Ação</th>
                      </tr>
                  </thead>
                  <tbody>
                      {superAdmins.map(admin => (
                          <tr key={admin.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                              <td style={{padding:'10px', fontWeight:'bold'}}>{admin.name}</td>
                              <td style={{padding:'10px'}}>{admin.email}</td>
                              <td style={{padding:'10px'}}>{admin.tenant_name}</td>
                              <td style={{padding:'10px', textAlign:'right'}}>
                                  <button 
                                    onClick={() => handleRemoveSuperAdmin(admin.id)}
                                    title="Remover Privilégios"
                                    style={{border:'none', background:'transparent', color:'#dc2626', cursor:'pointer'}}
                                  >
                                      <UserMinus size={18} />
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {/* MODAL CONFIGURAR EMPRESA (COM AUTO-FILL DE PLANO) */}
      <Modal isOpen={!!editingTenant} onClose={() => setEditingTenant(null)} title={`Configurar: ${editingTenant?.name}`}>
        <form onSubmit={handleSavePlan}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Plano Atual</label>
              <select 
                className={styles.input} 
                value={formPlan.plan_tier} 
                onChange={handlePlanChange} // <--- AUTO-FILL LÓGICA
              >
                {plans.map(p => (
                    <option key={p.id} value={p.name}>{p.name} (Max {p.max_users} users)</option>
                ))}
                {/* Fallback se o plano atual não estiver na lista */}
                {!plans.find(p => p.name === formPlan.plan_tier) && <option value={formPlan.plan_tier}>{formPlan.plan_tier}</option>}
              </select>
            </div>
            
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Limite de Usuários</label>
                    <input type="number" className={styles.input} value={formPlan.max_users} onChange={e => setFormPlan({...formPlan, max_users: e.target.value})} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Limite de IA</label>
                    <input type="number" className={styles.input} value={formPlan.ai_usage_limit} onChange={e => setFormPlan({...formPlan, ai_usage_limit: e.target.value})} />
                </div>
            </div>

            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop:'10px', padding:'10px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'6px'}}>
               <input type="checkbox" checked={formPlan.active} onChange={e => setFormPlan({...formPlan, active: e.target.checked})} style={{width:'20px', height:'20px'}}/>
               <label style={{fontWeight:'bold', color:'#92400e'}}>Empresa Ativa (Desmarque para bloquear acesso)</label>
            </div>
            <button type="submit" className={styles.btnSave}>Salvar Alterações</button>
        </form>
      </Modal>

      {/* MODAL PLANOS (CRIAR/EDITAR) */}
      <Modal isOpen={isPlanModalOpen} onClose={() => setIsPlanModalOpen(false)} title={editingPlan ? "Editar Plano" : "Novo Plano"}>
          <form onSubmit={handleSavePlanTemplate}>
              <div className={styles.formGroup}>
                  <label className={styles.label}>Nome do Plano</label>
                  <input className={styles.input} required value={planFormData.name} onChange={e => setPlanFormData({...planFormData, name: e.target.value})} placeholder="Ex: Gold" />
              </div>
              <div className={styles.formGroup}>
                  <label className={styles.label}>Preço (R$)</label>
                  <input className={styles.input} type="number" step="0.01" value={planFormData.price} onChange={e => setPlanFormData({...planFormData, price: e.target.value})} />
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                  <div className={styles.formGroup}>
                      <label className={styles.label}>Max Usuários</label>
                      <input type="number" className={styles.input} value={planFormData.max_users} onChange={e => setPlanFormData({...planFormData, max_users: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                      <label className={styles.label}>Max IA Requests</label>
                      <input type="number" className={styles.input} value={planFormData.ai_usage_limit} onChange={e => setPlanFormData({...planFormData, ai_usage_limit: e.target.value})} />
                  </div>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <input type="checkbox" checked={planFormData.active} onChange={e => setPlanFormData({...planFormData, active: e.target.checked})} style={{width:'20px', height:'20px'}}/>
                  <label>Ativo para vendas</label>
              </div>
              <button type="submit" className={styles.btnSave}>Salvar Modelo</button>
          </form>
      </Modal>

      {/* MODAL CRIAR EMPRESA */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Nova Empresa">
        <form onSubmit={handleCreateTenant}>
            <div className={styles.formGroup}>
                <label className={styles.label}>Nome da Empresa</label>
                <input className={styles.input} required value={newTenant.companyName} onChange={e => setNewTenant({...newTenant, companyName: e.target.value})} />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.label}>Slug (URL)</label>
                <input className={styles.input} required value={newTenant.slug} onChange={e => setNewTenant({...newTenant, slug: e.target.value})} />
            </div>
            <div style={{borderTop:'1px solid #eee', margin:'1rem 0'}}></div>
            <div className={styles.formGroup}>
                <label className={styles.label}>Nome do Admin</label>
                <input className={styles.input} required value={newTenant.name} onChange={e => setNewTenant({...newTenant, name: e.target.value})} />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.label}>Email do Admin</label>
                <input type="email" className={styles.input} required value={newTenant.email} onChange={e => setNewTenant({...newTenant, email: e.target.value})} />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.label}>Senha Inicial</label>
                <input type="password" className={styles.input} required value={newTenant.password} onChange={e => setNewTenant({...newTenant, password: e.target.value})} />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.label}>Plano Inicial</label>
                <select className={styles.input} value={newTenant.plan_tier} onChange={e => setNewTenant({...newTenant, plan_tier: e.target.value})}>
                    {plans.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
            </div>
            <button type="submit" className={styles.btnSave}>Criar Empresa</button>
        </form>
      </Modal>

      {/* MODAL ADD SUPER ADMIN */}
      <Modal isOpen={isAddAdminModalOpen} onClose={() => setIsAddAdminModalOpen(false)} title="Adicionar Super Admin">
          <form onSubmit={handleAddSuperAdmin}>
              <div className={styles.formGroup}>
                  <label className={styles.label}>Email do Usuário</label>
                  <input 
                    type="email" 
                    className={styles.input} 
                    required 
                    value={newAdminEmail} 
                    onChange={e => setNewAdminEmail(e.target.value)} 
                    placeholder="usuario@empresa.com"
                  />
              </div>
              <button type="submit" className={styles.btnSave}>Conceder Acesso Total</button>
          </form>
      </Modal>

    </div>
  );
}