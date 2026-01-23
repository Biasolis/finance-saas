import { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import styles from './Login.module.css'; // Importação do CSS Module
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { signIn, signed } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Se já estiver logado, redireciona para Dashboard
  if (signed) {
    return <Navigate to="/dashboard" />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn(email, password);

    if (!result.success) {
      setError(result.message);
      setLoading(false);
    }
    // Se sucesso, o AuthContext atualiza o estado e o <Navigate> acima atua
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Finance SaaS</h1>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email Corporativo</label>
            <input 
              type="email" 
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@empresa.com"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Senha</label>
            <input 
              type="password" 
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="********"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Entrando...' : 'Aceder ao Painel'}
          </button>
        </form>
      </div>
    </div>
  );
}