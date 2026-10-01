import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Enfermeria: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Módulo de Enfermería</h1>
          <div className="flex items-center gap-4">
            <span>{user?.nombre}</span>
            <button
              onClick={logout}
              className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-gray-100"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Gestión de Casos Quirúrgicos</h2>
          <p className="text-gray-600">
            Módulo en desarrollo - FASE 0: Login y autenticación funcional
          </p>
        </div>
      </main>
    </div>
  );
};

export default Enfermeria;
