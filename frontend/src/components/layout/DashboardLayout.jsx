import Sidebar from './Sidebar';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({ children }) {
  return (
    <div className={styles.layout}>
      {/* Sidebar sempre visível em desktop */}
      <div className={styles.sidebarWrapper}>
         <Sidebar />
      </div>
      
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}