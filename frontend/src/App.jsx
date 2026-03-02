import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useContext } from 'react';
import './styles/global.css';

// Páginas
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword'; // <--- NOVO
import ResetPassword from './pages/auth/ResetPassword';   // <--- NOVO

import DashboardHome from './pages/dashboard/DashboardHome';
import Transactions from './pages/dashboard/Transactions';
import Reports from './pages/dashboard/Reports';
import Settings from './pages/dashboard/Settings';
import ServiceOrders from './pages/dashboard/ServiceOrders';
import Clients from './pages/dashboard/Clients';
import Recurring from './pages/dashboard/Recurring';
import PrintOS from './pages/dashboard/PrintOS';
import Products from './pages/dashboard/Products';
import AuditLogs from './pages/dashboard/AuditLogs';
import Notifications from './pages/dashboard/Notifications';
import Profile from './pages/dashboard/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';

const PrivateRoute = ({ children }) => {
  const { signed, loading } = useContext(AuthContext);
  if (loading) return <div style={{height: '100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Carregando...</div>;
  return signed ? children : <Navigate to="/login" />;
};

const SuperAdminRoute = ({ children }) => {
  const { signed, user, loading } = useContext(AuthContext);
  if (loading) return <div style={{height: '100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Carregando...</div>;
  const isSuperUser = user?.isSuperAdmin === true || user?.is_super_admin === true;
  if (signed && isSuperUser) return children;
  return <Navigate to="/dashboard" />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Rotas de Autenticação */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} /> {/* <--- ROTA */}
      <Route path="/reset-password/:token" element={<ResetPassword />} /> {/* <--- ROTA */}
      
      {/* Rotas Protegidas */}
      <Route path="/dashboard" element={<PrivateRoute><DashboardHome /></PrivateRoute>} />
      <Route path="/dashboard/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
      <Route path="/dashboard/recurring" element={<PrivateRoute><Recurring /></PrivateRoute>} />
      <Route path="/dashboard/products" element={<PrivateRoute><Products /></PrivateRoute>} />
      <Route path="/dashboard/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
      <Route path="/dashboard/service-orders" element={<PrivateRoute><ServiceOrders /></PrivateRoute>} />
      <Route path="/dashboard/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
      <Route path="/dashboard/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/dashboard/audit" element={<PrivateRoute><AuditLogs /></PrivateRoute>} />
      <Route path="/dashboard/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
      <Route path="/dashboard/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

      <Route path="/print/os/:id" element={<PrivateRoute><PrintOS /></PrivateRoute>} />

      <Route path="/admin" element={<SuperAdminRoute><AdminDashboard /></SuperAdminRoute>} />

      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}