import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Requests from './pages/Requests';
import Purchases from './pages/Purchases';
import Complaints from './pages/Complaints';
import Analytics from './pages/Analytics';
import AIInsights from './pages/AIInsights';
import AuditLog from './pages/AuditLog';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Guard component to enforce authentication and RBAC roles
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppContent = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Application Routes inside Layout */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="requests" element={<Requests />} />
          <Route 
            path="purchases" 
            element={
              <ProtectedRoute allowedRoles={['Administrator', 'HOD', 'Principal', 'Management']}>
                <Purchases />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="complaints" 
            element={
              <ProtectedRoute allowedRoles={['Administrator', 'Staff', 'HOD']}>
                <Complaints />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="analytics" 
            element={
              <ProtectedRoute allowedRoles={['Administrator', 'HOD', 'Principal', 'Management']}>
                <Analytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="ai-insights" 
            element={
              <ProtectedRoute allowedRoles={['Administrator', 'HOD', 'Principal', 'Management']}>
                <AIInsights />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="audit-logs" 
            element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <AuditLog />
              </ProtectedRoute>
            } 
          />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
