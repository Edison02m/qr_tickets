import React, { useState, useEffect } from 'react';
import AdminDashboard from './components/admin/AdminDashboard';
import VendedorDashboard from './components/vendedor/VendedorDashboard';

declare global {
  interface Window {
    electronAPI: {
      login: (credentials: { usuario: string; password: string }) => Promise<{ success: boolean; message?: string; user?: any }>;
      logout: () => Promise<{ success: boolean }>;
      getCurrentUser: () => Promise<any>;
      setMenu: (role: string) => Promise<any>;
      getTicketTypes: () => Promise<any[]>;
      getActiveTicketTypes: () => Promise<any[]>;
      createTicketType: (data: { nombre: string; precio: number }) => Promise<any>;
      updateTicketType: (data: { id: number; nombre: string; precio: number }) => Promise<any>;
      deleteTicketType: (id: number) => Promise<any>;
      toggleTicketTypeStatus: (id: number, active: boolean) => Promise<any>;
  createSale: (ticketTypeId: number, amount: number, qrCode: string) => Promise<any>;
      getDailySales: () => Promise<any[]>;
      printTicket: (html: string) => Promise<{ success: boolean }>;

      // CRUD usuarios
      getUsers: () => Promise<any[]>;
      createUser: (data: { nombre: string; usuario: string; password: string; rol: string }) => Promise<any>;
      updateUser: (data: { id: number; nombre: string; usuario: string; rol: string }) => Promise<any>;
      changeUserPassword: (id: number, newPassword: string) => Promise<any>;
      toggleUserStatus: (id: number, active: boolean) => Promise<any>;
      deleteUser: (id: number) => Promise<any>;

  // Ventas admin
  getAllDailySales: () => Promise<any[]>;
  annulSale: (ventaId: number) => Promise<any>;

  // Cierres de caja
  getAllCashClosures: () => Promise<any[]>;
  createCashClosure: (data: { usuario_id: number; fecha_inicio: string; total_ventas: number; cantidad_tickets: number; detalle_tipos: string; }) => Promise<any>;
  updateCashClosure: (data: { usuario_id: number; fecha_inicio: string; total_ventas: number; cantidad_tickets: number; detalle_tipos: string; }) => Promise<any>;
    };
  }
}

interface User {
  id: number;
  nombre: string;
  usuario: string;
  rol: 'vendedor' | 'admin';
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkCurrentUser();
    
    // Listen for menu actions
    const handleMenuAction = (event: CustomEvent) => {
      const action = event.detail;
      switch (action) {
        case 'logout':
          handleLogout();
          break;
        case 'cash-closure':
          console.log('Cierre de caja seleccionado');
          break;
        case 'users':
          console.log('Gestión de usuarios seleccionada');
          break;
        case 'ticket-types':
          console.log('Tipos de tickets seleccionados');
          break;
        case 'new-sale':
          console.log('Nueva venta seleccionada');
          break;
        case 'daily-sales':
          console.log('Ventas del día seleccionadas');
          break;
      }
    };
    
    window.addEventListener('menu-action', handleMenuAction as EventListener);
    
    return () => {
      window.removeEventListener('menu-action', handleMenuAction as EventListener);
    };
  }, []);

  const checkCurrentUser = async () => {
    try {
      if (window.electronAPI) {
        const user = await window.electronAPI.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setIsLoggedIn(true);
          // Set menu based on user role
          await window.electronAPI.setMenu(user.rol);
        } else {
          // Ensure login menu is set when no user is logged in
          await window.electronAPI.setMenu('login');
        }
      }
    } catch (error) {
      console.error('Error checking current user:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.login({ usuario: username, password });
        
        if (result.success) {
          setCurrentUser(result.user);
          setIsLoggedIn(true);
          // Set menu based on user role
          await window.electronAPI.setMenu(result.user.rol);
        } else {
          setError(result.message || 'Error al iniciar sesión');
        }
      } else {
        setError('Sistema no disponible');
      }
    } catch (error) {
      console.error('Error en login:', error);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.logout();
        await window.electronAPI.setMenu('login');
      }
      setIsLoggedIn(false);
      setCurrentUser(null);
      setUsername('');
      setPassword('');
    } catch (error) {
      console.error('Error en logout:', error);
    }
  };

  if (isLoggedIn && currentUser) {
    if (currentUser.rol === 'admin') {
      return <AdminDashboard user={currentUser} onLogout={handleLogout} />;
    } else {
      return <VendedorDashboard user={currentUser} onLogout={handleLogout} />;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 flex items-center justify-center p-6">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-gray-400/30 via-transparent to-transparent opacity-70"></div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left: Illustration / Logo */}
        <div className="hidden md:flex flex-col items-center justify-center px-8">
          <div className="bg-gradient-to-br from-gray-200/60 to-white/10 rounded-3xl p-8 glass-card shadow-2xl w-full animate-float-up">
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-100/40 to-white/10 flex items-center justify-center logo-bounce">
                {/* simple SVG logo */}
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="20" height="20" rx="4" fill="#222"/>
                  <path d="M7 12h10" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 8h10" stroke="#666" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 16h6" stroke="#666" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Bienvenido al Sistema</h2>
            <p className="text-center text-gray-500">Gestiona ventas y tickets de forma rápida y confiable.</p>
          </div>
        </div>

        {/* Right: Login card */}
        <div className="bg-gradient-to-b from-white/80 to-gray-100/60 glass-card rounded-3xl p-8 shadow-2xl border border-gray-200 w-full animate-float-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">Iniciar Sesión</h1>
              <p className="text-sm text-gray-600 mt-1">Ingresa tus credenciales para continuar</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Usuario</label>
              <div className="input-underline flex items-center">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all"
                  placeholder="Ingrese su usuario"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Contraseña</label>
              <div className="input-underline flex items-center">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all"
                  placeholder="Ingrese su contraseña"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md p-3 text-sm toast-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

export default App;
