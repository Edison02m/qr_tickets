// Preload script for Electron
// This runs in a privileged context between the main process and renderer

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  logout: () => ipcRenderer.invoke('logout'),
  getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
  
  // Menu management
  setMenu: (role) => ipcRenderer.invoke('set-menu', role),
  
  // Ticket system
  getTicketTypes: () => ipcRenderer.invoke('get-ticket-types'),
  createSale: (saleData) => ipcRenderer.invoke('create-sale', saleData)
});