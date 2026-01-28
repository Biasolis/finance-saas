import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import { Bell, CheckCheck, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export default function Notifications() {
  const { addToast } = useContext(ToastContext);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifs();
  }, []);

  async function loadNotifs() {
      try {
          const res = await api.get('/notifications');
          setNotifs(res.data);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  }

  async function markAll() {
      await api.patch('/notifications/read-all');
      setNotifs(notifs.map(n => ({...n, is_read: true})));
      addToast({ type: 'success', title: 'Todas marcadas como lidas' });
  }

  const getIcon = (type) => {
      if(type === 'warning') return <AlertTriangle color="#d97706" />;
      if(type === 'error') return <AlertCircle color="#dc2626" />;
      return <Info color="#2563eb" />;
  };

  return (
    <DashboardLayout>
       <div style={{background: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', maxWidth:'800px', margin:'0 auto'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <Bell size={24} color="#4b5563"/>
                    <h2 style={{fontSize:'1.5rem', color:'#1f2937', margin:0}}>Central de Notificações</h2>
                </div>
                <button onClick={markAll} style={{
                    border:'none', background:'transparent', color:'#2563eb', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px', fontWeight:'600'
                }}>
                    <CheckCheck size={18} /> Marcar tudo como lido
                </button>
            </div>

            {loading ? <p>Verificando alertas...</p> : (
                <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                    {notifs.map(n => (
                        <div key={n.id} style={{
                            padding:'1rem', borderRadius:'8px', border:'1px solid',
                            borderColor: n.is_read ? '#e5e7eb' : (n.type === 'error' ? '#fecaca' : '#fde68a'),
                            background: n.is_read ? '#f9fafb' : (n.type === 'error' ? '#fef2f2' : '#fffbeb'),
                            opacity: n.is_read ? 0.7 : 1,
                            display:'flex', gap:'1rem', alignItems:'start'
                        }}>
                            <div style={{marginTop:'2px'}}>{getIcon(n.type)}</div>
                            <div>
                                <h4 style={{margin:'0 0 4px 0', color:'#1f2937'}}>{n.title}</h4>
                                <p style={{margin:0, color:'#4b5563', fontSize:'0.95rem'}}>{n.message}</p>
                                <small style={{color:'#9ca3af', marginTop:'5px', display:'block'}}>{new Date(n.created_at).toLocaleString()}</small>
                            </div>
                        </div>
                    ))}
                    {notifs.length === 0 && <p style={{textAlign:'center', color:'#9ca3af', padding:'2rem'}}>Tudo limpo! Nenhuma notificação.</p>}
                </div>
            )}
       </div>
    </DashboardLayout>
  );
}