import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import styles from './Auth.module.css'; // Reutilizando estilo do Login
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', msg: '' });

    try {
      await api.post('/auth/forgot-password', { email });
      setStatus({ type: 'success', msg: 'Email enviado! Verifique sua caixa de entrada.' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Erro ao enviar email. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2>Recuperar Senha</h2>
          <p>Digite seu email para receber o link.</p>
        </div>

        {status.msg && (
            <div style={{
                padding: '10px', borderRadius: '6px', marginBottom: '1rem',
                background: status.type === 'success' ? '#dcfce7' : '#fee2e2',
                color: status.type === 'success' ? '#166534' : '#991b1b',
                fontSize: '0.9rem', textAlign: 'center'
            }}>
                {status.msg}
            </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Email</label>
            <div className={styles.inputWrapper}>
              <Mail size={20} />
              <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
          </div>

          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? <Loader2 className="spin" size={20} /> : 'Enviar Link'}
          </button>
        </form>

        <div className={styles.footer}>
          <Link to="/login" style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'5px', textDecoration:'none', color:'#4b5563'}}>
             <ArrowLeft size={16} /> Voltar para Login
          </Link>
        </div>
      </div>
    </div>
  );
}