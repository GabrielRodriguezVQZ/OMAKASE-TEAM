import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Enfermeria from './pages/Enfermeria';
import Quirofano from './pages/Quirofano';
import Gestion from './pages/Gestion';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRole?: string }> = ({
  children,
  allowedRole,
}) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (allowedRole && user?.rol !== allowedRole) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/enfermeria"
            element={
              <ProtectedRoute allowedRole="ENFERMERIA">
                <Enfermeria />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quirofano"
            element={
              <ProtectedRoute allowedRole="QUIROFANO">
                <Quirofano />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestion"
            element={
              <ProtectedRoute allowedRole="ADMIN">
                <Gestion />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
