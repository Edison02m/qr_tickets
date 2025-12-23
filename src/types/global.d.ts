/// <reference types="react-scripts" />

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
      
      // Autenticación
      login: (credentials: { usuario: string; password: string }) => Promise<any>;
      logout: () => Promise<void>;
      getCurrentUser: () => Promise<any>;
      
      // Gestión de menú
      setMenu: (role: string) => Promise<void>;
      
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
      
      // Configuración de Botones de Impresión Automática
      configurarBoton: (config: BotonConfigRequest) => Promise<BotonConfig>;
      obtenerConfigBotones: () => Promise<BotonConfig[]>;
      obtenerBotonPorInput: (input_numero: number) => Promise<BotonConfig | null>;
      desactivarBoton: (input_numero: number) => Promise<{ success: boolean; message: string }>;
      eliminarBoton: (input_numero: number) => Promise<{ success: boolean; message: string }>;
    };
  }
}

export {};
