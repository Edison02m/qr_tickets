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

  const renderContent = () => {
    switch (currentView) {
      case 'ticket-types':
        return <TicketTypesAdmin />;
      case 'users':
        return <UsersAdmin />;
      case 'cash-closure':
        return <div className="p-6">Cierre de Caja (En desarrollo)</div>;
      case 'daily-sales':
        return <div className="p-6">Ventas del Día (En desarrollo)</div>;
      default:
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Vista de Administrador
            </h2>
            <p className="text-gray-600">
              Esta es la vista exclusiva para administradores. Seleccione una opción del menú superior
              para acceder a las diferentes funciones del sistema.
            </p>
            <div className="mt-6 space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-medium text-gray-900">Gestión de Usuarios</h3>
                <p className="text-sm text-gray-600">Administrar usuarios del sistema</p>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-lg font-medium text-gray-900">Tipos de Tickets</h3>
                <p className="text-sm text-gray-600">Administrar tipos y precios de tickets</p>
              </div>
              <div className="border-l-4 border-yellow-500 pl-4">
                <h3 className="text-lg font-medium text-gray-900">Reportes y Estadísticas</h3>
                <p className="text-sm text-gray-600">Ver reportes detallados de ventas</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Panel de Administrador</h1>
              <p className="text-sm text-gray-600 mt-1">Bienvenido, {user.nombre}</p>
            </div>
            <button
              onClick={onLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;