/// <reference types="react-scripts" />

// Interfaces globales para tipos de datos del sistema
interface TicketType {
  id: number;
  nombre: string;
  precio: number;
  activo: boolean;
}

interface Puerta {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  lector_ip?: string;
  lector_port?: number;
  relay_number?: number;
  tiempo_apertura_segundos?: number;
  activo: boolean;
  fecha_creacion: string;
}

interface ConfigRelay {
  id: number;
  ip: string;
  port: number;
  timeout: number;
  reintentos: number;
  fecha_actualizacion: string;
}

interface BotonConfig {
  id?: number;
  input_numero: number;
  tipo_ticket_id: number | null;
  tipo_ticket_nombre?: string;
  tipo_ticket_precio?: number;
  cantidad: number;
  descripcion: string;
  activo: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

interface BotonConfigRequest {
  input_numero: number;
  tipo_ticket_id: number;
  cantidad: number;
  descripcion?: string;
  activo?: boolean;
}

interface ConfigLog {
  id: number;
  accion: 'crear' | 'modificar' | 'eliminar';
  tabla_afectada: 'puertas' | 'config_relay' | 'tipos_ticket' | 'botones_tickets' | 'usuarios';
  registro_id: number;
  descripcion: string;
  datos_anteriores: any; // JSON object
  datos_nuevos: any; // JSON object
  fecha_hora: string;
  ip_address?: string;
  usuario_id?: number;
  usuario_nombre?: string;
}

interface ConfigLogFiltros {
  limit?: number;
  offset?: number;
  tabla_afectada?: string;
  accion?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

interface EstadisticaLog {
  tabla_afectada: string;
  accion: string;
  total: number;
}

// Interfaces para Control de Acceso QR
interface ControlAccesoLogEntry {
  timestamp: string;
  level: string;
  message: string;
}

interface ControlAccesoStatus {
  running: boolean;
  uptime?: number;
  conectado?: boolean;
}

// Interfaces para diálogos
interface DialogMessageOptions {
  message: string;
  title?: string;
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
}

interface DialogConfirmOptions {
  message: string;
  title?: string;
}

// Declaraciones globales para window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      // Cierres de caja
      getAllCashClosures: () => Promise<any[]>;
      createCashClosure: (data: any) => Promise<any>;
      updateCashClosure: (data: any) => Promise<any>;
      upsertCashClosure: (data: any) => Promise<any>;
      getCashClosureByDateAndUser: (usuario_id: number, fecha_inicio: string) => Promise<any>;
      getAllCashClosuresByDate: (fecha: string) => Promise<any>;
      closeCashClosure: (cierreId: number) => Promise<any>;
      reopenCashClosure: (cierreId: number) => Promise<any>;
      
      // Autenticación
      login: (credentials: { usuario: string; password: string }) => Promise<any>;
      logout: () => Promise<void>;
      getCurrentUser: () => Promise<any>;
      
      // Gestión de menú
      setMenu: (role: string) => Promise<void>;
      
      // Sistema de diálogos (fix focus bug)
      showMessage: (options: DialogMessageOptions) => Promise<{ response: number; checkboxChecked?: boolean }>;
      showConfirm: (options: DialogConfirmOptions) => Promise<boolean>;
      
      // Sistema de tickets
      getTicketTypes: () => Promise<TicketType[]>;
      getActiveTicketTypes: () => Promise<TicketType[]>;
      createTicketType: (data: any) => Promise<TicketType>;
      updateTicketType: (data: any) => Promise<TicketType>;
      toggleTicketTypeStatus: (id: number, active: boolean) => Promise<void>;
      deleteTicketType: (id: number) => Promise<void>;
      createSale: (ticketTypeId: number, amount: number, qrCode: string, puertaCodigo: string) => Promise<any>;
      confirmarImpresion: (ventaId: number) => Promise<any>;
      getDailySales: () => Promise<any[]>;
      getVendedorDailySummary: (fecha: string) => Promise<any>;
      getVendedorDailySummaryByUser: (userId: number, fecha: string) => Promise<any>;
      
      // Sistema de impresión
      printTicket: (html: string) => Promise<void>;
      
      // Gestión de usuarios
      getUsers: () => Promise<any[]>;
      createUser: (data: any) => Promise<any>;
      updateUser: (data: any) => Promise<any>;
      changeUserPassword: (id: number, newPassword: string) => Promise<void>;
      toggleUserStatus: (id: number, active: boolean) => Promise<void>;
      deleteUser: (id: number) => Promise<void>;
      
      // Ventas del día (admin)
      getAllDailySales: () => Promise<any[]>;
      annulSale: (ventaId: number) => Promise<void>;
      
      // Puertas/Ubicaciones
      getPuertas: () => Promise<Puerta[]>;
      getActivePuertas: () => Promise<Puerta[]>;
      createPuerta: (data: any) => Promise<Puerta>;
      updatePuerta: (data: any) => Promise<Puerta>;
      togglePuertaStatus: (id: number, active: boolean) => Promise<void>;
      deletePuerta: (id: number) => Promise<void>;
      
      // Configuración del Relay X-410
      getConfigRelay: () => Promise<ConfigRelay>;
      updateConfigRelay: (data: any) => Promise<ConfigRelay>;
      
      // Configuración de Botones de Impresión Automática (solo para servidor HTTP)
      obtenerBotonPorInput: (input_numero: number) => Promise<BotonConfig | null>;
      obtenerConfigBotones: () => Promise<BotonConfig[]>;
      configurarBoton: (data: BotonConfigRequest) => Promise<BotonConfig>;
      desactivarBoton: (input_numero: number) => Promise<void>;
      eliminarBoton: (input_numero: number) => Promise<void>;
      
      // Logs de configuración
      obtenerConfigLogs: (filtros?: ConfigLogFiltros) => Promise<ConfigLog[]>;
      contarConfigLogs: (filtros?: ConfigLogFiltros) => Promise<number>;
      obtenerEstadisticasLogs: () => Promise<EstadisticaLog[]>;
      obtenerHistorialRegistro: (tabla: string, registro_id: number) => Promise<ConfigLog[]>;
      
      // Control de Acceso QR - Logs y Servicio
      getControlAccesoLogs: (logType: 'accesos' | 'errores', maxLines: number) => Promise<ControlAccesoLogEntry[]>;
      getControlAccesoStatus: () => Promise<ControlAccesoStatus>;
      restartControlAccesoService: () => Promise<{ success: boolean; error?: string }>;
      clearControlAccesoLogs: (logType: 'accesos' | 'errores') => Promise<{ success: boolean; error?: string }>;
      
      // Configuración de MySQL
      testMysqlConnection: (config: any) => Promise<any>;
      saveMysqlConfig: (config: any) => Promise<any>;
      getMysqlConfig: () => Promise<any>;
    };
  }
}

export {};
