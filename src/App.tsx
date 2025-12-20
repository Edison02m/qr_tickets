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
      createTicketType: (data: { nombre: string; precio: number; puerta_id?: number }) => Promise<any>;
      updateTicketType: (data: { id: number; nombre: string; precio: number; puerta_id?: number }) => Promise<any>;
      deleteTicketType: (id: number) => Promise<any>;
      toggleTicketTypeStatus: (id: number, active: boolean) => Promise<any>;
      createSale: (ticketTypeId: number, amount: number, qrCode: string, puertaCodigo?: string) => Promise<any>;
      getDailySales: () => Promise<any[]>;
      getVendedorDailySummary: (fecha?: string) => Promise<any>;
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
  upsertCashClosure: (data: { usuario_id: number; fecha_inicio: string; total_ventas: number; cantidad_tickets: number; detalle_tipos: string; }) => Promise<any>;
  getCashClosureByDateAndUser: (usuario_id: number, fecha_inicio: string) => Promise<any>;

  // Puertas/Ubicaciones
  getPuertas: () => Promise<any[]>;
  getActivePuertas: () => Promise<any[]>;
  createPuerta: (data: { nombre: string; codigo: string; descripcion?: string }) => Promise<any>;
  updatePuerta: (data: { id: number; nombre: string; codigo: string; descripcion?: string }) => Promise<any>;
  togglePuertaStatus: (id: number, active: boolean) => Promise<any>;
  deletePuerta: (id: number) => Promise<any>;
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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="h-screen flex overflow-hidden">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex lg:w-[30%] relative bg-gradient-to-br from-[#1D324D] via-[#2C4A65] to-[#457373]">
        {/* Abstract Floating Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-16 left-8 w-20 h-20 bg-[#DFE4E4] opacity-20 rounded-full blur-xl"></div>
          <div className="absolute top-1/4 right-4 w-32 h-32 bg-[#F1EADC] opacity-15 rounded-full blur-2xl"></div>
          <div className="absolute bottom-1/4 left-4 w-16 h-16 bg-[#7C4935] opacity-25 rounded-full blur-lg"></div>
          <div className="absolute bottom-16 right-8 w-24 h-24 bg-[#457373] opacity-30 rounded-full blur-xl"></div>
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-3">
          <div className="h-full w-full" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)`,
            backgroundSize: '30px 30px'
          }}></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center h-full px-8">
          <div className="text-center">
            {/* Decorative Line */}
            <div className="w-16 h-1 bg-[#F1EADC] mx-auto mb-8 rounded-full"></div>
            
            {/* Title */}
            <h1 className="text-4xl font-light text-white mb-4 leading-tight">
              Sistema
              <span className="block font-medium text-[#F1EADC] mt-1">Tickets</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-[#DFE4E4] text-lg leading-relaxed font-light max-w-xs mx-auto">
              Gestión y control eficiente de ventas
            </p>
            
            {/* Decorative Elements */}
            <div className="flex justify-center space-x-2 mt-8">
              <div className="w-2 h-2 bg-[#F1EADC] rounded-full opacity-60"></div>
              <div className="w-2 h-2 bg-[#457373] rounded-full opacity-80"></div>
              <div className="w-2 h-2 bg-[#7C4935] rounded-full opacity-60"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-[70%] flex items-center justify-center p-8 bg-gradient-to-br from-[#F1EADC] to-[#DFE4E4]">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-light text-[#1D324D] mb-3">Iniciar Sesión</h2>
            <p className="text-[#7C4935] text-sm font-light">Accede a tu cuenta para continuar</p>
          </div>

          {/* Form Card */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/50">
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Usuario Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#1D324D] opacity-80">Usuario</label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-4 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-2xl text-[#1D324D] placeholder-[#7C4935]/60 focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300"
                    placeholder="Ingresa tu usuario"
                    required
                  />
                </div>
              </div>

              {/* Contraseña Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#1D324D] opacity-80">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-4 pr-12 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-2xl text-[#1D324D] placeholder-[#7C4935]/60 focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300"
                    placeholder="Ingresa tu contraseña"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#7C4935] hover:text-[#457373] focus:outline-none transition-colors duration-200"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.111 8.111m1.767 1.767l4.242 4.242m0 0L16.288 16.288m-2.168-2.168a3 3 0 01-4.243-4.243m4.243 4.243L8.111 8.111" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.065 7-9.543 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-xl">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#1D324D] to-[#457373] text-white font-medium py-4 px-6 rounded-2xl hover:from-[#457373] hover:to-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:ring-offset-2 transform transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Accediendo...
                  </div>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-xs text-[#7C4935]/70 font-light">
              Sistema seguro y confiable © 2024
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
