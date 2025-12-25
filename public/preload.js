// Preload script for Electron
// This runs in a privileged context between the main process and renderer

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Cierres de caja
  getAllCashClosures: () => ipcRenderer.invoke('getAllCashClosures'),
  createCashClosure: (data) => ipcRenderer.invoke('createCashClosure', data),
  updateCashClosure: (data) => ipcRenderer.invoke('updateCashClosure', data),
  upsertCashClosure: (data) => ipcRenderer.invoke('upsertCashClosure', data),
  getCashClosureByDateAndUser: (usuario_id, fecha_inicio) => ipcRenderer.invoke('getCashClosureByDateAndUser', usuario_id, fecha_inicio),
  getAllCashClosuresByDate: (fecha) => ipcRenderer.invoke('getAllCashClosuresByDate', fecha),
  // Authentication
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  logout: () => ipcRenderer.invoke('logout'),
  getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
  
  // Menu management
  setMenu: (role) => ipcRenderer.invoke('set-menu', role),
  
  // Ticket system
  getTicketTypes: () => ipcRenderer.invoke('getTicketTypes'),
  getActiveTicketTypes: () => ipcRenderer.invoke('getActiveTicketTypes'),
  createTicketType: (data) => ipcRenderer.invoke('createTicketType', data),
  updateTicketType: (data) => ipcRenderer.invoke('updateTicketType', data),
  toggleTicketTypeStatus: (id, active) => ipcRenderer.invoke('toggleTicketTypeStatus', id, active),
  deleteTicketType: (id) => ipcRenderer.invoke('deleteTicketType', id),
  // Ahora acepta el código QR y puerta_codigo generado en el frontend
  createSale: (ticketTypeId, amount, qrCode, puertaCodigo) => ipcRenderer.invoke('createSale', ticketTypeId, amount, qrCode, puertaCodigo),
  confirmarImpresion: (ventaId) => ipcRenderer.invoke('confirmarImpresion', ventaId),
  getDailySales: () => ipcRenderer.invoke('getDailySales'),
  getVendedorDailySummary: (fecha) => ipcRenderer.invoke('getVendedorDailySummary', fecha),
  getVendedorDailySummaryByUser: (userId, fecha) => ipcRenderer.invoke('getVendedorDailySummaryByUser', userId, fecha),
  // Printing system
  printTicket: (html) => ipcRenderer.invoke('print-ticket', html)

  // User management
  ,getUsers: () => ipcRenderer.invoke('getUsers')
  ,createUser: (data) => ipcRenderer.invoke('createUser', data)
  ,updateUser: (data) => ipcRenderer.invoke('updateUser', data)
  ,changeUserPassword: (id, newPassword) => ipcRenderer.invoke('changeUserPassword', id, newPassword)
  ,toggleUserStatus: (id, active) => ipcRenderer.invoke('toggleUserStatus', id, active)
  ,deleteUser: (id) => ipcRenderer.invoke('deleteUser', id)

  // Ventas del día para admin
  ,getAllDailySales: () => ipcRenderer.invoke('getAllDailySales')
  ,annulSale: (ventaId) => ipcRenderer.invoke('annulSale', ventaId)

  // Puertas/Ubicaciones
  ,getPuertas: () => ipcRenderer.invoke('getPuertas')
  ,getActivePuertas: () => ipcRenderer.invoke('getActivePuertas')
  ,createPuerta: (data) => ipcRenderer.invoke('createPuerta', data)
  ,updatePuerta: (data) => ipcRenderer.invoke('updatePuerta', data)
  ,togglePuertaStatus: (id, active) => ipcRenderer.invoke('togglePuertaStatus', id, active)
  ,deletePuerta: (id) => ipcRenderer.invoke('deletePuerta', id)

  // Configuración del Relay X-410
  ,getConfigRelay: () => ipcRenderer.invoke('getConfigRelay')
  ,updateConfigRelay: (data) => ipcRenderer.invoke('updateConfigRelay', data)

  // Configuración de Botones de Impresión Automática
  ,configurarBoton: (config) => ipcRenderer.invoke('configurarBoton', config)
  ,obtenerConfigBotones: () => ipcRenderer.invoke('obtenerConfigBotones')
  ,obtenerBotonPorInput: (input_numero) => ipcRenderer.invoke('obtenerBotonPorInput', input_numero)
  ,desactivarBoton: (input_numero) => ipcRenderer.invoke('desactivarBoton', input_numero)
  ,eliminarBoton: (input_numero) => ipcRenderer.invoke('eliminarBoton', input_numero)

  // Logs de configuración
  ,obtenerConfigLogs: (filtros) => ipcRenderer.invoke('obtener-config-logs', filtros)
  ,contarConfigLogs: (filtros) => ipcRenderer.invoke('contar-config-logs', filtros)
  ,obtenerEstadisticasLogs: () => ipcRenderer.invoke('obtener-estadisticas-logs')
  ,obtenerHistorialRegistro: (tabla, registro_id) => ipcRenderer.invoke('obtener-historial-registro', tabla, registro_id)
});