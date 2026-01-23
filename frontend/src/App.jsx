import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useContext } from 'react';
import './styles/global.css';

// Páginas
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import DashboardHome from './pages/dashboard/DashboardHome';
import Transactions from './pages/dashboard/Transactions';
import Reports from './pages/dashboard/Reports';
import AdminDashboard from './pages/admin/AdminDashboard';

// Componente para proteger rotas Privadas (Logado)
const PrivateRoute = ({ children }) => {
  const { signed, loading } = useContext(AuthContext);

  if (loading) {
    return <div style={{height: '100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Carregando...</div>;
  }

  return signed ? children : <Navigate to="/login" />;
};

// Componente para proteger rotas de Super Admin (Logado + Flag Admin)
const SuperAdminRoute = ({ children }) => {
  const { signed, user, loading } = useContext(AuthContext);

  if (loading) {
    return <div style={{height: '100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Carregando...</div>;
  }
  
  // VERIFICAÇÃO HÍBRIDA (Aceita isSuperAdmin OU is_super_admin)
  // Isso resolve o problema de redirecionamento se o nome da variável variar
  const isSuperUser = user?.isSuperAdmin === true || user?.is_super_admin === true;

  // Debug no console para você verificar se está sendo bloqueado
  if (signed && !isSuperUser) {
      console.warn("Acesso Admin Bloqueado. Objeto User atual:", user);
  }

  if (signed && isSuperUser) {
     return children;
  }
  
  // Se não for admin, manda pro dashboard normal
  return <Navigate to="/dashboard" />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Rotas Protegidas (Clientes) */}
      <Route path="/dashboard" element={
        <PrivateRoute>
          <DashboardHome />
        </PrivateRoute>
      } />
      
      <Route path="/dashboard/transactions" element={
        <PrivateRoute>
          <Transactions />
        </PrivateRoute>
      } />

      <Route path="/dashboard/reports" element={
        <PrivateRoute>
          <Reports />
        </PrivateRoute>
      } />

      {/* Rota Protegida (Super Admin) */}
      <Route path="/admin" element={
        <SuperAdminRoute>
          <AdminDashboard />
        </SuperAdminRoute>
      } />

      {/* Redirecionamentos Padrão */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/* ToastProvider envolve tudo para funcionar em qualquer tela */}
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}