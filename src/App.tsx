import React, { useState, useEffect } from 'react';
import AdminDashboard from './components/admin/AdminDashboard';
import VendedorDashboard from './components/vendedor/VendedorDashboard';
import { showSuccess, showError } from './utils/dialogs';
import packageJson from '../package.json';

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
  annulTicket: (ticketId: number) => Promise<any>;

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

  // Control de Acceso QR - Logs y Servicio
  getControlAccesoLogs: (logType: 'accesos' | 'errores', maxLines: number) => Promise<any[]>;
  getControlAccesoStatus: () => Promise<{ running: boolean; uptime?: number; conectado?: boolean }>;
  restartControlAccesoService: () => Promise<{ success: boolean; error?: string }>;
  clearControlAccesoLogs: (logType: 'accesos' | 'errores') => Promise<{ success: boolean; error?: string }>;

  // Configuración de Botones de Impresión Automática (solo para servidor HTTP)
  obtenerBotonPorInput: (input_numero: number) => Promise<any | null>;
  
  // Reiniciar aplicación
  relaunchApp: () => void;

  // Configuración de impresora
  getPrinters: () => Promise<{ success: boolean; printers?: any[]; error?: string }>;
  savePrinterConfig: (config: any) => Promise<{ success: boolean; message?: string; error?: string }>;
  getPrinterConfig: () => Promise<{ success: boolean; config?: any; error?: string }>;
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
  
  // Estados para configuración de MySQL
  const [showMysqlConfig, setShowMysqlConfig] = useState(false);
  const [mysqlConfig, setMysqlConfig] = useState({
    host: 'localhost',
    port: 3306,
    user: 'tickets_user',
    password: 'tickets2026',
    database: 'tickets_db'
  });
  const [mysqlConfigError, setMysqlConfigError] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);

  // Helper para resetear el estado de prueba cuando cambian los campos
  const handleMysqlConfigChange = (field: string, value: any) => {
    setMysqlConfig({ ...mysqlConfig, [field]: value });
    setConnectionTested(false);
    setMysqlConfigError('');
  };

  // Cargar configuración guardada y probar conexión automáticamente
  const loadMysqlConfig = async () => {
    try {
      if (window.electronAPI && (window.electronAPI as any).getMysqlConfig) {
        const response = await (window.electronAPI as any).getMysqlConfig();
        
        // Usar la configuración guardada o la por defecto
        const configToUse = response?.config || {
          host: 'localhost',
          port: 3306,
          user: 'tickets_user',
          password: 'tickets2026',
          database: 'tickets_db'
        };
        
        setMysqlConfig(configToUse);
        
        // Probar la conexión automáticamente con la configuración cargada
        try {
          if ((window.electronAPI as any).testMysqlConnection) {
            const result = await (window.electronAPI as any).testMysqlConnection(configToUse);
            
            if (result.success) {
              setConnectionTested(true);
            }
          }
        } catch (error) {
          // Si falla la conexión automática, no hacemos nada
          // El usuario tendrá que probar manualmente
        }
      }
    } catch (error) {
      console.error('Error al cargar configuración MySQL:', error);
    }
  };

  useEffect(() => {
    checkCurrentUser();
    loadMysqlConfig();
    
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

  const handleSaveMysqlConfig = async () => {
    setSavingConfig(true);
    setMysqlConfigError('');
    
    try {
      if (window.electronAPI && (window.electronAPI as any).saveMysqlConfig) {
        const result = await (window.electronAPI as any).saveMysqlConfig(mysqlConfig);
        
        if (result.success) {
          setMysqlConfigError('');
          await showSuccess('Configuración guardada correctamente.\n\nLa aplicación se reiniciará para aplicar los cambios.');
          
          // Reiniciar la aplicación automáticamente después de 1 segundo
          setTimeout(() => {
            if (window.electronAPI && (window.electronAPI as any).relaunchApp) {
              (window.electronAPI as any).relaunchApp();
            }
          }, 1000);
        } else {
          setMysqlConfigError(result.error || 'Error al guardar configuración');
        }
      }
    } catch (error: any) {
      setMysqlConfigError(error.message || 'Error al guardar configuración');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestMysqlConnection = async () => {
    setMysqlConfigError('');
    setTestingConnection(true);
    setConnectionTested(false);
    
    try {
      if (window.electronAPI && (window.electronAPI as any).testMysqlConnection) {
        const result = await (window.electronAPI as any).testMysqlConnection(mysqlConfig);
        
        if (result.success) {
          setConnectionTested(true);
          await showSuccess(`Conexión exitosa!\n\nBase de datos: ${result.database}\nTablas encontradas: ${result.tables}`);
        } else {
          setMysqlConfigError(result.error || 'Error de conexión');
        }
      }
    } catch (error: any) {
      setMysqlConfigError(error.message || 'Error al probar conexión');
    } finally {
      setTestingConnection(false);
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
      {/* Left Side - Brand Section with MySQL Config */}
      <div className="hidden lg:flex lg:w-2/5 relative bg-gradient-to-br from-[#1D324D] to-[#457373] overflow-hidden flex-col">
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
        <div className="relative z-10 flex flex-col justify-between h-full py-12 px-12">
          {/* Top Section - Branding */}
          <div>
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

          {/* Bottom Section - MySQL Configuration */}
          <div className="mt-auto">
            <button
              onClick={() => setShowMysqlConfig(!showMysqlConfig)}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white hover:bg-white/15 transition-all duration-200 flex items-center justify-between mb-4"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                <span className="text-sm font-medium">Configuración del servidor</span>
              </div>
              <svg 
                className={`w-5 h-5 transition-transform duration-200 ${showMysqlConfig ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* MySQL Config Panel (Collapsible) */}
            {showMysqlConfig && (
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 space-y-3 max-h-[calc(100vh-450px)] overflow-y-auto">
                <p className="text-white/80 text-xs mb-3">
                  Configura la conexión al servidor MySQL. Usa <span className="font-semibold">localhost</span> si es el PC principal.
                </p>

                {/* Host */}
                <div>
                  <label className="block text-white/90 text-xs font-medium mb-1.5">Servidor (IP o localhost)</label>
                  <input
                    type="text"
                    value={mysqlConfig.host}
                    onChange={(e) => handleMysqlConfigChange('host', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
                    placeholder="localhost o 192.168.1.100"
                  />
                </div>

                {/* Port */}
                <div>
                  <label className="block text-white/90 text-xs font-medium mb-1.5">Puerto</label>
                  <input
                    type="number"
                    value={mysqlConfig.port}
                    onChange={(e) => handleMysqlConfigChange('port', parseInt(e.target.value) || 3306)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
                    placeholder="3306"
                  />
                </div>

                {/* Usuario */}
                <div>
                  <label className="block text-white/90 text-xs font-medium mb-1.5">Usuario BD</label>
                  <input
                    type="text"
                    value={mysqlConfig.user}
                    onChange={(e) => handleMysqlConfigChange('user', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
                    placeholder="tickets_user"
                  />
                </div>

                {/* Contraseña */}
                <div>
                  <label className="block text-white/90 text-xs font-medium mb-1.5">Contraseña BD</label>
                  <input
                    type="password"
                    value={mysqlConfig.password}
                    onChange={(e) => handleMysqlConfigChange('password', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>

                {/* Base de datos */}
                <div>
                  <label className="block text-white/90 text-xs font-medium mb-1.5">Base de Datos</label>
                  <input
                    type="text"
                    value={mysqlConfig.database}
                    onChange={(e) => handleMysqlConfigChange('database', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
                    placeholder="tickets_db"
                  />
                </div>

                {/* Error Message */}
                {mysqlConfigError && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-2">
                    <p className="text-red-200 text-xs">{mysqlConfigError}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleTestMysqlConnection}
                    disabled={testingConnection}
                    className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testingConnection ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Probando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Probar
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSaveMysqlConfig}
                    disabled={savingConfig || !connectionTested}
                    className="flex-1 bg-white hover:bg-white/90 text-[#1D324D] px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    title={!connectionTested ? 'Primero debes probar la conexión exitosamente' : ''}
                  >
                    {savingConfig ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        Guardar
                      </>
                    )}
                  </button>
                </div>

                {/* Info messages */}
                {!connectionTested && (
                  <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-2 mt-2">
                    <p className="text-yellow-200 text-xs">⚠️ Primero debes probar la conexión exitosamente</p>
                  </div>
                )}

                <p className="text-white/60 text-[10px] pt-2 italic">
                  * La aplicación se reiniciará después de guardar
                </p>
              </div>
            )}
          </div>
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
            <p className="text-xs text-gray-400 mt-1">
              Versión {packageJson.version}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
