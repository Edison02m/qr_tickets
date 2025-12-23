import React, { useState, useEffect } from 'react';
import TicketTypesAdmin from './TicketTypesAdmin';
import UsersAdmin from './UsersAdmin';
import PuertasAdmin from './PuertasAdmin';
import ConfigRelayAdmin from './ConfigRelayAdmin';

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
        case 'puertas':
          setCurrentView('puertas');
          break;
        case 'config-relay':
          setCurrentView('config-relay');
          break;
        case 'config-botones':
          setCurrentView('config-botones');
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
  const ConfigBotonesAdmin = require('./ConfigBotonesAdmin').default;

  const renderContent = () => {
    switch (currentView) {
      case 'ticket-types':
        return <TicketTypesAdmin />;
      case 'users':
        return <UsersAdmin />;
      case 'puertas':
        return <PuertasAdmin />;
      case 'config-relay':
        return <ConfigRelayAdmin />;
      case 'config-botones':
        return <ConfigBotonesAdmin />;
      case 'cash-closure':
        return <CashClosureAdmin userId={user.id} userRole={user.rol} />;
      case 'daily-sales':
        return <DailySalesAdmin />;
      default:
        return (
          <div className="space-y-6">
            {/* Header minimalista */}
            <div className="mb-8">
              <h2 className="text-2xl font-light text-[#1D324D] mb-2">Panel de Control</h2>
              <p className="text-sm text-[#1D324D]/60">Gestión administrativa del sistema</p>
            </div>

            {/* Grid de tarjetas simplificado */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Usuarios */}
              <button
                onClick={() => setCurrentView('users')}
                className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-[#457373] hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#1D324D]/5 flex items-center justify-center group-hover:bg-[#1D324D] transition-colors duration-200">
                    <svg className="w-6 h-6 text-[#1D324D] group-hover:text-white transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-[#1D324D] mb-1">Usuarios</h3>
                    <p className="text-sm text-[#1D324D]/60">Gestionar usuarios</p>
                  </div>
                </div>
              </button>

              {/* Tipos de Tickets */}
              <button
                onClick={() => setCurrentView('ticket-types')}
                className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-[#457373] hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#457373]/5 flex items-center justify-center group-hover:bg-[#457373] transition-colors duration-200">
                    <svg className="w-6 h-6 text-[#457373] group-hover:text-white transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-[#1D324D] mb-1">Tipos de Tickets</h3>
                    <p className="text-sm text-[#1D324D]/60">Precios y categorías</p>
                  </div>
                </div>
              </button>

              {/* Puertas */}
              <button
                onClick={() => setCurrentView('puertas')}
                className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-[#457373] hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#7C4935]/5 flex items-center justify-center group-hover:bg-[#7C4935] transition-colors duration-200">
                    <svg className="w-6 h-6 text-[#7C4935] group-hover:text-white transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-[#1D324D] mb-1">Puertas</h3>
                    <p className="text-sm text-[#1D324D]/60">Puntos de acceso</p>
                  </div>
                </div>
              </button>

              {/* Configuración del Relay */}
              <button
                onClick={() => setCurrentView('config-relay')}
                className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-[#457373] hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#457373]/5 flex items-center justify-center group-hover:bg-[#457373] transition-colors duration-200">
                    <svg className="w-6 h-6 text-[#457373] group-hover:text-white transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-[#1D324D] mb-1">Configuración del Relay</h3>
                    <p className="text-sm text-[#1D324D]/60">Control X-410</p>
                  </div>
                </div>
              </button>

              {/* Ventas */}
              <button
                onClick={() => setCurrentView('daily-sales')}
                className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-[#457373] hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#457373]/5 flex items-center justify-center group-hover:bg-[#457373] transition-colors duration-200">
                    <svg className="w-6 h-6 text-[#457373] group-hover:text-white transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-[#1D324D] mb-1">Ventas</h3>
                    <p className="text-sm text-[#1D324D]/60">Historial de ventas</p>
                  </div>
                </div>
              </button>

              {/* Cierres de Caja */}
              <button
                onClick={() => setCurrentView('cash-closure')}
                className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-[#457373] hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#1D324D]/5 flex items-center justify-center group-hover:bg-[#1D324D] transition-colors duration-200">
                    <svg className="w-6 h-6 text-[#1D324D] group-hover:text-white transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-[#1D324D] mb-1">Cierres de Caja</h3>
                    <p className="text-sm text-[#1D324D]/60">Control de caja diario</p>
                  </div>
                </div>
              </button>

              {/* Botones de Impresión */}
              <button
                onClick={() => setCurrentView('config-botones')}
                className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-[#457373] hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/5 flex items-center justify-center group-hover:bg-purple-500 transition-colors duration-200">
                    <svg className="w-6 h-6 text-purple-500 group-hover:text-white transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-[#1D324D] mb-1">Botones de Impresión</h3>
                    <p className="text-sm text-[#1D324D]/60">Configurar botones físicos</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header minimalista */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-medium text-[#1D324D]">Administración</h1>
              <span className="text-sm text-gray-400">•</span>
              <span className="text-sm text-gray-600">{user.nombre}</span>
            </div>
            <div className="flex items-center gap-2">
              {currentView !== 'main' ? (
                <button
                  onClick={() => setCurrentView('main')}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-[#1D324D] hover:bg-gray-100 rounded-lg transition-colors duration-150 flex items-center gap-2"
                  title="Volver al inicio"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Regresar
                </button>
              ) : (
                <button
                  onClick={onLogout}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-[#1D324D] hover:bg-gray-100 rounded-lg transition-colors duration-150 flex items-center gap-2"
                  title="Cerrar sesión"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                  </svg>
                  Cerrar sesión
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 lg:px-8 py-8 w-full">
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminDashboard;