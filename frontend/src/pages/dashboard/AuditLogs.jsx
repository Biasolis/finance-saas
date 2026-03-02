import { useEffect, useState } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Shield, Activity, User } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/audit').then(res => {
        setLogs(res.data);
        setLoading(false);
    });
  }, []);

  const formatDate = (date) => new Date(date).toLocaleString('pt-BR');

  const actionColor = {
      'CREATE': '#16a34a',
      'UPDATE': '#ca8a04',
      'DELETE': '#dc2626',
      'LOGIN': '#2563eb'
  };

  return (
    <DashboardLayout>
      <div style={{background: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'1.5rem'}}>
            <Shield size={24} color="#4b5563"/>
            <div>
                <h2 style={{fontSize:'1.5rem', color:'#1f2937', margin:0}}>Trilha de Auditoria</h2>
                <p style={{color:'#6b7280', margin:0}}>Histórico de segurança e ações críticas.</p>
            </div>
        </div>

        {loading ? <p>Carregando logs...</p> : (
            <table style={{width:'100%', borderCollapse:'collapse'}}>
                <thead>
                    <tr style={{background:'#f9fafb', textAlign:'left', borderBottom:'2px solid #e5e7eb'}}>
                        <th style={{padding:'1rem'}}>Data</th>
                        <th style={{padding:'1rem'}}>Usuário</th>
                        <th style={{padding:'1rem'}}>Ação</th>
                        <th style={{padding:'1rem'}}>Detalhes</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map(log => (
                        <tr key={log.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                            <td style={{padding:'1rem', color:'#6b7280', fontSize:'0.9rem'}}>{formatDate(log.created_at)}</td>
                            <td style={{padding:'1rem', fontWeight:'500'}}>
                                <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                    <User size={14}/> {log.user_name || 'Sistema'}
                                </div>
                            </td>
                            <td style={{padding:'1rem'}}>
                                <span style={{
                                    padding:'2px 8px', borderRadius:'4px', color:'white', fontSize:'0.75rem', fontWeight:'bold',
                                    background: actionColor[log.action] || '#6b7280'
                                }}>
                                    {log.action}
                                </span>
                                <div style={{fontSize:'0.75rem', color:'#9ca3af', marginTop:'2px'}}>{log.entity}</div>
                            </td>
                            <td style={{padding:'1rem', color:'#374151'}}>{log.details}</td>
                        </tr>
                    ))}
                    {logs.length === 0 && <tr><td colSpan="4" style={{textAlign:'center', padding:'20px'}}>Nenhum registro encontrado.</td></tr>}
                </tbody>
            </table>
        )}
      </div>
    </DashboardLayout>
  );
}