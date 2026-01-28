import { Link, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { LayoutDashboard, Receipt, BarChart3, Settings as SettingsIcon, LogOut, ClipboardList, Users, Repeat, Package, Shield, Bell, UserCircle } from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function Sidebar() {
  const location = useLocation();
  const { signOut, user } = useContext(AuthContext);

  const isActive = (path) => location.pathname === path;

  // Helper Avatar
  const getAvatarUrl = (path) => {
      if(!path) return null;
      return path.startsWith('http') ? path : `http://localhost:3000${path}`;
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        {/* AVATAR NO HEADER DO SIDEBAR */}
        <div style={{marginBottom:'10px'}}>
            {user?.avatar ? (
                <img 
                    src={getAvatarUrl(user.avatar)} 
                    alt="User" 
                    style={{width:'50px', height:'50px', borderRadius:'50%', objectFit:'cover', border:'2px solid white'}} 
                />
            ) : (
                <div style={{width:'50px', height:'50px', borderRadius:'50%', background:'#e5e7eb', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto'}}>
                    <UserCircle size={30} color="#6b7280" />
                </div>
            )}
        </div>
        
        <h2>{user?.name?.split(' ')[0]}</h2>
        <small style={{opacity:0.8}}>{user?.companyName}</small>
      </div>

      <nav className={styles.nav}>
        <Link to="/dashboard" className={`${styles.link} ${isActive('/dashboard') ? styles.active : ''}`}>
          <LayoutDashboard size={20} /> Visão Geral
        </Link>
        
        <Link to="/dashboard/notifications" className={`${styles.link} ${isActive('/dashboard/notifications') ? styles.active : ''}`}>
          <Bell size={20} /> Notificações
        </Link>

        <Link to="/dashboard/transactions" className={`${styles.link} ${isActive('/dashboard/transactions') ? styles.active : ''}`}>
          <Receipt size={20} /> Transações
        </Link>
        
        <Link to="/dashboard/recurring" className={`${styles.link} ${isActive('/dashboard/recurring') ? styles.active : ''}`}>
          <Repeat size={20} /> Recorrências
        </Link>

        <Link to="/dashboard/products" className={`${styles.link} ${isActive('/dashboard/products') ? styles.active : ''}`}>
          <Package size={20} /> Estoque
        </Link>

        <Link to="/dashboard/clients" className={`${styles.link} ${isActive('/dashboard/clients') ? styles.active : ''}`}>
          <Users size={20} /> Clientes
        </Link>

        <Link to="/dashboard/service-orders" className={`${styles.link} ${isActive('/dashboard/service-orders') ? styles.active : ''}`}>
          <ClipboardList size={20} /> Ordens de Serviço
        </Link>
        
        <Link to="/dashboard/reports" className={`${styles.link} ${isActive('/dashboard/reports') ? styles.active : ''}`}>
          <BarChart3 size={20} /> Relatórios IA
        </Link>

        <div style={{borderTop:'1px solid rgba(255,255,255,0.1)', margin:'10px 0'}}></div>

        {/* LINK PERFIL */}
        <Link to="/dashboard/profile" className={`${styles.link} ${isActive('/dashboard/profile') ? styles.active : ''}`}>
          <UserCircle size={20} /> Meu Perfil
        </Link>

        {/* LINK ADMIN (Só aparece se for SuperAdmin) */}
        {/* Nota: user.isSuperAdmin pode vir do login ou do banco */}
        <Link to="/dashboard/audit" className={`${styles.link} ${isActive('/dashboard/audit') ? styles.active : ''}`}>
          <Shield size={20} /> Auditoria
        </Link>

        <Link to="/dashboard/settings" className={`${styles.link} ${isActive('/dashboard/settings') ? styles.active : ''}`}>
          <SettingsIcon size={20} /> Configurações
        </Link>
      </nav>

      <div className={styles.footer}>
        <button onClick={signOut} className={styles.logoutBtn}>
          <LogOut size={18} /> Sair do Sistema
        </button>
      </div>
    </aside>
  );
}