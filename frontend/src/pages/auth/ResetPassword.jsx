import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import styles from './Auth.module.css';
import { Lock, Loader2, CheckCircle } from 'lucide-react';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
        return setError('As senhas não conferem.');
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Link inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
      return (
        <div className={styles.container}>
            <div className={styles.card} style={{textAlign:'center'}}>
                <CheckCircle size={50} color="#16a34a" style={{margin:'0 auto 1rem'}} />
                <h2>Senha Alterada!</h2>
                <p>Sua senha foi redefinida com sucesso.</p>
                <p>Redirecionando para o login...</p>
            </div>
        </div>
      );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2>Nova Senha</h2>
          <p>Crie uma senha segura para sua conta.</p>
        </div>

        {error && <div style={{padding:'10px', background:'#fee2e2', color:'#991b1b', borderRadius:'6px', marginBottom:'1rem', fontSize:'0.9rem'}}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Nova Senha</label>
            <div className={styles.inputWrapper}>
              <Lock size={20} />
              <input type="password" placeholder="******" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Confirmar Senha</label>
            <div className={styles.inputWrapper}>
              <Lock size={20} />
              <input type="password" placeholder="******" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
          </div>

          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? <Loader2 className="spin" size={20} /> : 'Redefinir Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}