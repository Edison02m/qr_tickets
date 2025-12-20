import React, { useState, useEffect } from 'react';
import TicketTypesAdmin from './TicketTypesAdmin';
import UsersAdmin from './UsersAdmin';
import PuertasAdmin from './PuertasAdmin';

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
      case 'puertas':
        return <PuertasAdmin />;
      case 'cash-closure':
        return <CashClosureAdmin userId={user.id} />;
      case 'daily-sales':
        return <DailySalesAdmin />;
      default:
        return (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/50">
            {/* Header Section */}
            <div className="text-center mb-12">
              <div className="w-16 h-1 bg-[#457373] mx-auto mb-6 rounded-full"></div>
              <h2 className="text-3xl font-light text-[#1D324D] mb-3 tracking-tight">Panel de Control</h2>
              <p className="text-[#7C4935] text-lg font-light">Selecciona una opción para comenzar</p>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Gestión de Usuarios */}
              <button
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-[#DFE4E4]/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group focus:outline-none focus:ring-2 focus:ring-[#457373]"
                onClick={() => setCurrentView('users')}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#1D324D] to-[#457373] rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-[#1D324D] mb-2">Usuarios</h3>
                  <p className="text-sm text-[#7C4935]/80 font-light">Gestiona usuarios del sistema</p>
                </div>
              </button>

              {/* Tipos de Tickets */}
              <button
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-[#DFE4E4]/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group focus:outline-none focus:ring-2 focus:ring-[#457373]"
                onClick={() => setCurrentView('ticket-types')}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#457373] to-[#7C4935] rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L9 10.5M5 5v8a2 2 0 002 2h2m0 0v2a2 2 0 002 2h2m2-2a2 2 0 012-2V9a2 2 0 00-2-2H9" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-[#1D324D] mb-2">Tickets</h3>
                  <p className="text-sm text-[#7C4935]/80 font-light">Administra tipos y precios</p>
                </div>
              </button>

              {/* Puertas */}
              <button
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-[#DFE4E4]/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group focus:outline-none focus:ring-2 focus:ring-[#457373]"
                onClick={() => setCurrentView('puertas')}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#7C4935] to-[#457373] rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-[#1D324D] mb-2">Puertas</h3>
                  <p className="text-sm text-[#7C4935]/80 font-light">Administra puertas de acceso</p>
                </div>
              </button>

              {/* Reportes */}
              <button
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-[#DFE4E4]/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group focus:outline-none focus:ring-2 focus:ring-[#457373]"
                onClick={() => setCurrentView('daily-sales')}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#1D324D] to-[#7C4935] rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-[#1D324D] mb-2">Reportes</h3>
                  <p className="text-sm text-[#7C4935]/80 font-light">Estadísticas de ventas</p>
                </div>
              </button>
            </div>

            {/* Second Row - Cash Closure */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
              {/* Cierres de Caja */}
              <button
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-[#DFE4E4]/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group focus:outline-none focus:ring-2 focus:ring-[#457373]"
                onClick={() => setCurrentView('cash-closure')}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#457373] to-[#1D324D] rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-[#1D324D] mb-2">Caja</h3>
                  <p className="text-sm text-[#7C4935]/80 font-light">Cierres y controles</p>
                </div>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F1EADC] to-[#DFE4E4] flex flex-col">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-[#DFE4E4]/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-8 bg-gradient-to-b from-[#457373] to-[#1D324D] rounded-full"></div>
              <div>
                <h1 className="text-lg font-medium text-[#1D324D] tracking-tight">Panel de Administrador</h1>
                <p className="text-xs text-[#7C4935]/80 font-light">Hola, <span className="font-medium text-[#1D324D]">{user.nombre}</span></p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {currentView !== 'main' && (
                <button
                  onClick={() => setCurrentView('main')}
                  className="p-2.5 bg-[#F1EADC]/50 text-[#1D324D] rounded-xl hover:bg-[#F1EADC] hover:scale-[1.05] transition-all duration-300 border border-white/50 group"
                  title="Volver al inicio"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                </button>
              )}
              <button
                onClick={onLogout}
                className="p-2.5 bg-gradient-to-r from-[#1D324D] to-[#457373] text-white rounded-xl hover:from-[#457373] hover:to-[#1D324D] hover:scale-[1.05] transition-all duration-300 shadow-lg group"
                title="Cerrar sesión"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminDashboard;