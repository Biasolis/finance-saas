import { useState, useContext } from 'react';
import api from '../../services/api';
import styles from './Login.module.css'; // Reutilizando o estilo do Login
import { useNavigate } from 'react-router-dom';
import { ToastContext } from '../../context/ToastContext'; // <--- Importar Contexto

export default function Register() {
  const navigate = useNavigate();
  const { addToast } = useContext(ToastContext); // <--- Hook do Toast
  const [form, setForm] = useState({ companyName: '', slug: '', name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    
    try {
      await api.post('/auth/register', form);
      
      // Substituindo alert por Toast
      addToast({ 
        type: 'success', 
        title: 'Empresa registrada com sucesso! Faça login.' 
      });
      
      navigate('/login');
    } catch (error) {
      console.error(error);
      addToast({ 
        type: 'error', 
        title: error.response?.data?.message || 'Falha ao registrar empresa' 
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Nova Empresa</h2>
        <form onSubmit={handleRegister} className={styles.form}>
          <div className={styles.inputGroup}>
             <label className={styles.label}>Nome da Empresa</label>
             <input className={styles.input} placeholder="Ex: Tech Solutions" onChange={e => setForm({...form, companyName: e.target.value})} required />
          </div>

          <div className={styles.inputGroup}>
             <label className={styles.label}>Identificador (Slug)</label>
             <input className={styles.input} placeholder="ex: tech-solutions" onChange={e => setForm({...form, slug: e.target.value})} required />
          </div>

          <div className={styles.inputGroup}>
             <label className={styles.label}>Seu Nome</label>
             <input className={styles.input} placeholder="Ex: João Silva" onChange={e => setForm({...form, name: e.target.value})} required />
          </div>

          <div className={styles.inputGroup}>
             <label className={styles.label}>Email Admin</label>
             <input className={styles.input} type="email" placeholder="admin@empresa.com" onChange={e => setForm({...form, email: e.target.value})} required />
          </div>

          <div className={styles.inputGroup}>
             <label className={styles.label}>Senha</label>
             <input className={styles.input} type="password" placeholder="********" onChange={e => setForm({...form, password: e.target.value})} required />
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Criando...' : 'Criar Conta'}
          </button>
        </form>
        
        <p style={{marginTop: '1rem', fontSize: '0.9rem', color: '#6b7280'}}>
            Já tem conta? <a href="/login" style={{color: 'var(--primary-color)', fontWeight: 'bold', textDecoration: 'none'}}>Entrar</a>
        </p>
      </div>
    </div>
  );
}