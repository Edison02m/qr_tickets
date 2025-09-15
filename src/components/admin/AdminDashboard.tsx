import React, { useState, useEffect } from 'react';
import TicketTypesAdmin from './TicketTypesAdmin';
import UsersAdmin from './UsersAdmin';

interface AdminDashboardProps {
  user: {
    id: number;
    nombre: string;
    usuario: string;
    rol: string;
  };
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [currentView, setCurrentView] = useState('main');

  useEffect(() => {
    // Escuchar eventos del menú
    const handleMenuAction = (event: CustomEvent) => {
      const action = event.detail;
      switch (action) {
        case 'ticket-types':
          setCurrentView('ticket-types');
          break;
        case 'users':
          setCurrentView('users');
          break;
        case 'cash-closure':
          setCurrentView('cash-closure');
          break;
        case 'daily-sales':
          setCurrentView('daily-sales');
          break;
        default:
          setCurrentView('main');
      }
    };

    window.addEventListener('menu-action', handleMenuAction as EventListener);

    return () => {
      window.removeEventListener('menu-action', handleMenuAction as EventListener);
    };
  }, []);

  // Importar componentes
  const DailySalesAdmin = require('./DailySalesAdmin').default;
  const CashClosureAdmin = require('./CashClosureAdmin').default;

  const renderContent = () => {
    switch (currentView) {
      case 'ticket-types':
        return <TicketTypesAdmin />;
      case 'users':
        return <UsersAdmin />;
      case 'cash-closure':
        return <CashClosureAdmin userId={user.id} />;
      case 'daily-sales':
        return <DailySalesAdmin />;
      default:
        return (
          <div className="bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 glass-card rounded-2xl shadow-xl p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Panel de Administrador</h2>
            <p className="text-gray-500 mb-6 text-base">Bienvenido, <span className="font-semibold text-gray-800">{user.nombre}</span>. Selecciona una opción para comenzar.</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
              <button
                className="glass-card rounded-xl p-6 flex flex-col items-center shadow group transition hover:shadow-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                onClick={() => setCurrentView('users')}
                tabIndex={0}
              >
                <div className="mb-3">
                  <svg className="w-8 h-8 text-blue-400 group-hover:text-blue-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12v4m0 0v4m0-4h4m-4 0h-4" /></svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Gestión de Usuarios</h3>
                <p className="text-sm text-gray-500 text-center">Administra los usuarios del sistema.</p>
              </button>
              <button
                className="glass-card rounded-xl p-6 flex flex-col items-center shadow group transition hover:shadow-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
                onClick={() => setCurrentView('ticket-types')}
                tabIndex={0}
              >
                <div className="mb-3">
                  <svg className="w-8 h-8 text-green-400 group-hover:text-green-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m0 0v4m0-4h4m-4 0h-4" /></svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Tipos de Tickets</h3>
                <p className="text-sm text-gray-500 text-center">Administra los tipos y precios de tickets.</p>
              </button>
              <button
                className="glass-card rounded-xl p-6 flex flex-col items-center shadow group transition hover:shadow-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                onClick={() => setCurrentView('daily-sales')}
                tabIndex={0}
              >
                <div className="mb-3">
                  <svg className="w-8 h-8 text-yellow-400 group-hover:text-yellow-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6" /></svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Reportes y Estadísticas</h3>
                <p className="text-sm text-gray-500 text-center">Consulta reportes detallados de ventas.</p>
              </button>
              <button
                className="glass-card rounded-xl p-6 flex flex-col items-center shadow group transition hover:shadow-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
                onClick={() => setCurrentView('cash-closure')}
                tabIndex={0}
              >
                <div className="mb-3">
                  <svg className="w-8 h-8 text-purple-400 group-hover:text-purple-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a5 5 0 00-10 0v2a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2z" /></svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Cierres de Caja</h3>
                <p className="text-sm text-gray-500 text-center">Ver y realizar cierres de caja.</p>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 flex flex-col">
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Panel de Administrador</h1>
              <p className="text-sm text-gray-500 mt-1">Bienvenido, <span className="font-medium text-gray-800">{user.nombre}</span></p>
            </div>
            <div className="flex items-center space-x-4">
              {currentView !== 'main' && (
                <button
                  onClick={() => setCurrentView('main')}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg shadow hover:bg-gray-200 transition-colors"
                >
                  Volver al Inicio
                </button>
              )}
              <button
                onClick={onLogout}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-800 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminDashboard;