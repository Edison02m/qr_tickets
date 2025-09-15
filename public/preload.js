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
  // Ahora acepta el código QR generado en el frontend
  createSale: (ticketTypeId, amount, qrCode) => ipcRenderer.invoke('createSale', ticketTypeId, amount, qrCode),
  getDailySales: () => ipcRenderer.invoke('getDailySales'),
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
});