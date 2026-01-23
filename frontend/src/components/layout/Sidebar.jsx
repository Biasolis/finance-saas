import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Settings, LogOut, PieChart } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const { user, signOut } = useContext(AuthContext);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoArea}>
        {/* Aqui iria a logo URL se configurada, fallback para texto */}
        <h2 className={styles.companyName}>
          {user?.tenantName || 'Finance SaaS'}
        </h2>
        <small style={{ color: '#6b7280' }}>{user?.email}</small>
      </div>

      <nav className={styles.nav}>
        <NavLink 
          to="/dashboard" 
          end
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <LayoutDashboard size={20} />
          Visão Geral
        </NavLink>

        <NavLink 
          to="/dashboard/transactions" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <Receipt size={20} />
          Transações
        </NavLink>

        <NavLink 
          to="/dashboard/reports" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <PieChart size={20} />
          Relatórios IA
        </NavLink>
        
        <NavLink 
          to="/dashboard/settings" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <Settings size={20} />
          Configurações
        </NavLink>
      </nav>

      <div className={styles.footer}>
        <button onClick={signOut} className={styles.logoutBtn}>
          <LogOut size={18} />
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
}