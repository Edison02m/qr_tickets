import React from 'react';

interface VendedorDashboardProps {
  user: {
    id: number;
    nombre: string;
    usuario: string;
    rol: string;
  };
  onLogout: () => void;
}

const VendedorDashboard: React.FC<VendedorDashboardProps> = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Panel de Vendedor</h1>
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
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Vista de Vendedor
          </h2>
          <p className="text-gray-600">
            Esta es la vista exclusiva para vendedores. Aquí se mostrarán las herramientas
            de venta de tickets.
          </p>
          <div className="mt-6 space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="text-lg font-medium text-gray-900">Venta de Tickets</h3>
              <p className="text-sm text-gray-600">Realizar ventas de tickets a clientes</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="text-lg font-medium text-gray-900">Cierre de Caja</h3>
              <p className="text-sm text-gray-600">Realizar cierre de caja diario</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="text-lg font-medium text-gray-900">Mis Ventas</h3>
              <p className="text-sm text-gray-600">Ver historial de ventas realizadas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendedorDashboard;