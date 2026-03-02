import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('saas_user');
    const storedToken = localStorage.getItem('saas_token');

    if (storedUser && storedToken) {
      try {
        // Validação básica de expiração
        const payloadBase64 = storedToken.split('.')[1];
        const payload = JSON.parse(atob(payloadBase64));
        const exp = payload.exp * 1000;

        if (Date.now() >= exp) {
            console.warn("AuthContext: Token expirado na inicialização.");
            signOut();
        } else {
            const parsedUser = JSON.parse(storedUser);
            
            // --- CORREÇÃO PRINCIPAL AQUI ---
            // Normalização Forçada na Inicialização (F5/Reload)
            // Garante que isSuperAdmin exista mesmo se vier como is_super_admin do cache antigo
            const isSuperAdmin = parsedUser.isSuperAdmin === true || parsedUser.is_super_admin === true;

            const normalizedUser = {
                ...parsedUser,
                isSuperAdmin: isSuperAdmin
            };

            // console.log("AuthContext: Usuário carregado e normalizado:", normalizedUser);
            
            setUser(normalizedUser);
            applyTheme(normalizedUser.tenant_color);
        }
      } catch (e) {
          console.error("AuthContext: Erro ao parsear token/user", e);
          signOut();
      }
    } else {
      setLoading(false);
    }
    setLoading(false);
  }, []);

  const applyTheme = (color) => {
    if (color) {
      document.documentElement.style.setProperty('--primary-color', color);
      document.documentElement.style.setProperty('--primary-hover', color); 
    }
  };

  const signIn = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      const { token, user: userData } = response.data;

      // --- CORREÇÃO PRINCIPAL AQUI ---
      // Normalização Forçada no Login
      const isSuperAdmin = userData.isSuperAdmin === true || userData.is_super_admin === true;

      const userWithTheme = { 
        ...userData, 
        tenant_color: userData.primary_color || '#2563eb',
        isSuperAdmin: isSuperAdmin // Salva já normalizado como camelCase
      };

      localStorage.setItem('saas_token', token);
      localStorage.setItem('saas_user', JSON.stringify(userWithTheme));

      setUser(userWithTheme);
      applyTheme(userWithTheme.tenant_color);

      return { success: true };
    } catch (error) {
      console.error("Erro no login:", error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Erro ao fazer login' 
      };
    }
  };

  const signOut = () => {
    localStorage.removeItem('saas_token');
    localStorage.removeItem('saas_user');
    setUser(null);
    document.documentElement.style.removeProperty('--primary-color');
    document.documentElement.style.removeProperty('--primary-hover');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, signed: !!user, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};