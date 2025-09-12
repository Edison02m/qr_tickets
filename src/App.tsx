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
      createSale: (saleData: any) => Promise<any>;
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 w-full max-w-md border border-white/20">
        <h1 className="text-3xl font-bold text-white text-center mb-8">
          Inicio de Sesión
        </h1>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all"
              placeholder="Ingrese su usuario"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all"
              placeholder="Ingrese su contraseña"
              required
            />
          </div>
          
          {error && (
            <div className="text-red-400 text-sm text-center">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>Usuario por defecto: admin / admin123</p>
        </div>
      </div>
    </div>
  );
}

export default App;
