import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import { AuthContext } from '../../context/AuthContext';
import styles from './Profile.module.css';
import { User, Camera, Save, Loader2 } from 'lucide-react';

export default function Profile() {
  const { addToast } = useContext(ToastContext);
  const { user, setUser } = useContext(AuthContext); // Precisamos atualizar o contexto global ao salvar

  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null); // Arquivo de avatar
  const [preview, setPreview] = useState(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // Carrega dados iniciais do contexto/api
    setForm(prev => ({ ...prev, name: user?.name || '', email: user?.email || '' }));
    if (user?.avatar) setPreview(getAvatarUrl(user.avatar));
  }, [user]);

  // Helper URL
  const getAvatarUrl = (path) => {
      if(!path) return null;
      return path.startsWith('http') ? path : `http://localhost:3000${path}`;
  };

  const handleFileChange = (e) => {
      const selected = e.target.files[0];
      setFile(selected);
      if(selected) {
          setPreview(URL.createObjectURL(selected));
      }
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      
      if (form.newPassword && form.newPassword !== form.confirmPassword) {
          return addToast({ type: 'error', title: 'A nova senha não confere.' });
      }
      
      if (!form.currentPassword) {
          return addToast({ type: 'error', title: 'Digite sua senha atual para confirmar.' });
      }

      setLoading(true);

      try {
          let avatarPath = user.avatar; // Mantém antigo se não mudar

          // 1. Upload do Avatar (se houver novo arquivo)
          if (file) {
              const formData = new FormData();
              formData.append('file', file);
              const uploadRes = await api.post('/upload', formData, {
                  headers: { 'Content-Type': 'multipart/form-data' }
              });
              avatarPath = uploadRes.data.url;
          }

          // 2. Atualiza Perfil
          const payload = {
              name: form.name,
              email: form.email,
              currentPassword: form.currentPassword,
              newPassword: form.newPassword,
              avatar_path: avatarPath
          };

          const response = await api.put('/auth/profile', payload);
          
          // 3. Atualiza Contexto Global (Local Storage e Estado)
          const updatedUser = { ...user, ...response.data.user };
          localStorage.setItem('saas_user', JSON.stringify(updatedUser));
          setUser(updatedUser);

          addToast({ type: 'success', title: 'Perfil atualizado com sucesso!' });
          
          // Limpa campos de senha
          setForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));

      } catch (error) {
          console.error(error);
          addToast({ type: 'error', title: error.response?.data?.message || 'Erro ao atualizar.' });
      } finally {
          setLoading(false);
      }
  };

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
            <h2 className={styles.title}>Meu Perfil</h2>
            <p className={styles.subtitle}>Gerencie suas informações pessoais</p>
        </div>

        <form onSubmit={handleSubmit}>
            {/* SEÇÃO AVATAR */}
            <div className={styles.avatarSection}>
                {preview ? (
                    <img src={preview} alt="Avatar" className={styles.avatar} />
                ) : (
                    <div className={styles.avatar} style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
                        <User size={40} color="#9ca3af" />
                    </div>
                )}
                <label className={styles.avatarUploadLabel}>
                    <Camera size={16} /> Alterar Foto
                    <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                </label>
            </div>

            {/* DADOS BÁSICOS */}
            <div className={styles.formGroup}>
                <label className={styles.label}>Nome Completo</label>
                <input className={styles.input} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.label}>Email</label>
                <input type="email" className={styles.input} value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>

            <div className={styles.sectionDivider}>
                <span className={styles.sectionLabel}>Segurança</span>
            </div>

            {/* SENHAS */}
            <div className={styles.formGroup}>
                <label className={styles.label}>Nova Senha (Opcional)</label>
                <input type="password" className={styles.input} placeholder="Deixe em branco para manter" value={form.newPassword} onChange={e => setForm({...form, newPassword: e.target.value})} />
            </div>
            {form.newPassword && (
                <div className={styles.formGroup}>
                    <label className={styles.label}>Confirme a Nova Senha</label>
                    <input type="password" className={styles.input} value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} />
                </div>
            )}

            <div className={styles.formGroup} style={{marginTop: '1.5rem'}}>
                <label className={styles.label} style={{color:'#dc2626'}}>Senha Atual (Obrigatório para salvar)</label>
                <input type="password" className={styles.input} required placeholder="Digite sua senha atual" value={form.currentPassword} onChange={e => setForm({...form, currentPassword: e.target.value})} />
            </div>

            <button type="submit" className={styles.btnSave} disabled={loading}>
                {loading ? <Loader2 className="spin" size={20}/> : <><Save size={20} /> Salvar Alterações</>}
            </button>
        </form>
      </div>
    </DashboardLayout>
  );
}