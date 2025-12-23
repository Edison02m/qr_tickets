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
      confirmarImpresion: (ventaId: number) => Promise<{ success: boolean; ventaId: number; ticketsActualizados: number }>;
      getDailySales: () => Promise<any[]>;
      getVendedorDailySummary: (fecha?: string) => Promise<any>;
      getVendedorDailySummaryByUser: (userId: number, fecha?: string) => Promise<any>;
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
  getAllCashClosuresByDate: (fecha: string) => Promise<{ fecha: string; cierres: any[]; totales: { total_ventas: number; cantidad_tickets: number; cantidad_usuarios: number } }>;

  // Puertas/Ubicaciones
  getPuertas: () => Promise<any[]>;
  getActivePuertas: () => Promise<any[]>;
  createPuerta: (data: { nombre: string; codigo: string; descripcion?: string; lector_ip?: string; lector_port?: number; relay_number?: number; tiempo_apertura_segundos?: number }) => Promise<any>;
  updatePuerta: (data: { id: number; nombre: string; codigo: string; descripcion?: string; lector_ip?: string; lector_port?: number; relay_number?: number; tiempo_apertura_segundos?: number }) => Promise<any>;
  togglePuertaStatus: (id: number, active: boolean) => Promise<any>;
  deletePuerta: (id: number) => Promise<any>;

  // Configuración del Relay X-410
  getConfigRelay: () => Promise<any>;
  updateConfigRelay: (data: { ip: string; port: number; timeout: number; reintentos: number }) => Promise<any>;

  // Configuración de Botones de Impresión Automática
  configurarBoton: (config: { input_numero: number; tipo_ticket_id: number; cantidad: number; descripcion?: string; activo?: boolean }) => Promise<any>;
  obtenerConfigBotones: () => Promise<any[]>;
  obtenerBotonPorInput: (input_numero: number) => Promise<any | null>;
  desactivarBoton: (input_numero: number) => Promise<{ success: boolean; message: string }>;
  eliminarBoton: (input_numero: number) => Promise<{ success: boolean; message: string }>;
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
          break;
        case 'users':
          break;
        case 'ticket-types':
          break;
        case 'new-sale':
          break;
        case 'daily-sales':
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
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Left Side - Brand Section */}
      <div className="hidden lg:flex lg:w-2/5 relative bg-gradient-to-br from-[#1D324D] to-[#457373] overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-start px-12 w-full">
          {/* Logo/Icon */}
          <div className="mb-8">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L9 10.5M5 5v8a2 2 0 002 2h2m0 0v2a2 2 0 002 2h2m2-2a2 2 0 012-2V9a2 2 0 00-2-2H9" />
              </svg>
            </div>
          </div>
          
          {/* Title */}
          <h1 className="text-4xl font-light text-white mb-3 tracking-tight">
            Sistema de<br />
            <span className="font-semibold">Tickets</span>
          </h1>
          
          {/* Description */}
          <p className="text-white/70 text-base max-w-xs leading-relaxed">
            Gestión y control de ventas con tecnología QR
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            {/* Mobile Logo */}
            <div className="lg:hidden mb-6">
              <div className="w-12 h-12 bg-[#1D324D] rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L9 10.5M5 5v8a2 2 0 002 2h2m0 0v2a2 2 0 002 2h2m2-2a2 2 0 012-2V9a2 2 0 00-2-2H9" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-3xl font-semibold text-[#1D324D] mb-2">Iniciar Sesión</h2>
            <p className="text-gray-600 text-sm">Ingresa tus credenciales para acceder al sistema</p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Usuario Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Usuario</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-200"
                    placeholder="tu_usuario"
                    required
                  />
                </div>
              </div>

              {/* Contraseña Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-200"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
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
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1D324D] text-white font-medium py-3 px-4 rounded-lg hover:bg-[#457373] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Verificando...</span>
                  </div>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Sistema de Gestión de Tickets © 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
