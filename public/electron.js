const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('../src/database/database'); // Ahora retorna instancia MySQL
const AuthService = require('../src/services/authService');
const axios = require('axios');

// Keep a global reference of the window object
let mainWindow;
let db = Database; // Database es ahora un singleton que retorna la instancia
let currentUser = null;

/**
 * Notifica a control-acceso-qr que recargue la configuración
 */
async function notificarRecargaConfig() {
  try {
    await axios.post('http://localhost:3002/api/config/reload', {}, { timeout: 2000 });
  } catch (error) {
    // Silencioso - control-acceso-qr puede no estar corriendo
  }
}

// Menu configurations
function setLoginMenu() {
  const template = [
    {
      label: 'Sistema de Tickets',
      submenu: [
        { label: 'Acerca de', role: 'about' },
        { type: 'separator' },
        { label: 'Salir', role: 'quit' }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function setAdminMenu() {
  const template = [
    {
      label: 'Sistema de Tickets',
      submenu: [
        { label: 'Acerca de', role: 'about' },
        { type: 'separator' },
        { label: 'Salir', role: 'quit' }
      ]
    },
    {
      label: 'Administración',
      submenu: [
        { label: 'Cierre de Caja', click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.executeJavaScript(`
              window.dispatchEvent(new CustomEvent('menu-action', { detail: 'cash-closure' }));
            `);
          }
        }},
        { label: 'Usuarios', click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.executeJavaScript(`
              window.dispatchEvent(new CustomEvent('menu-action', { detail: 'users' }));
            `);
          }
        }},
        { label: 'Tipos de Tickets', click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.executeJavaScript(`
              window.dispatchEvent(new CustomEvent('menu-action', { detail: 'ticket-types' }));
            `);
          }
        }},
        { label: 'Puertas', click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.executeJavaScript(`
              window.dispatchEvent(new CustomEvent('menu-action', { detail: 'puertas' }));
            `);
          }
        }},
        { label: 'Configuración del Relay', click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.executeJavaScript(`
              window.dispatchEvent(new CustomEvent('menu-action', { detail: 'config-relay' }));
            `);
          }
        }},
        { label: 'Control de Acceso', click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.executeJavaScript(`
              window.dispatchEvent(new CustomEvent('menu-action', { detail: 'control-acceso' }));
            `);
          }
        }},
        { type: 'separator' },
        { label: 'Cerrar Sesión', click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.executeJavaScript(`
              if (window.electronAPI) {
                window.electronAPI.logout().then(() => {
                  window.electronAPI.setMenu('login');
                });
              }
            `);
          }
        }}
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function setVendedorMenu() {
  const template = [
    {
      label: 'Sistema de Tickets',
      submenu: [
        { label: 'Acerca de', role: 'about' },
        { type: 'separator' },
        { label: 'Salir', role: 'quit' }
      ]
    },
    {
      label: 'Ventas',
      submenu: [
        { label: 'Nueva Venta', click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.executeJavaScript(`
              window.dispatchEvent(new CustomEvent('menu-action', { detail: 'new-sale' }));
            `);
          }
        }},
        { label: 'Ventas del Día', click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.executeJavaScript(`
              window.dispatchEvent(new CustomEvent('menu-action', { detail: 'daily-sales' }));
            `);
          }
        }},
        { label: 'Cierre de Caja', click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.executeJavaScript(`
              window.dispatchEvent(new CustomEvent('menu-action', { detail: 'cash-closure' }));
            `);
          }
        }},
        { type: 'separator' },
        { label: 'Cerrar Sesión', click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.executeJavaScript(`
              if (window.electronAPI) {
                window.electronAPI.logout().then(() => {
                  window.electronAPI.setMenu('login');
                });
              }
            `);
          }
        }}
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Sistema Tickets',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    titleBarStyle: 'default',
    show: false,
    webSecurity: false
  });

  // Load the appropriate URL based on environment
  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_START_URL;
  // Solo abrir DevTools si se solicita explícitamente
  const showDevTools = process.env.SHOW_DEV_TOOLS === 'true' || process.argv.includes('--devtools');
  
  if (isDev) {
    // Development mode - load from localhost
    const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
    mainWindow.loadURL(startUrl);
    // Solo abrir DevTools si se solicita explícitamente
    if (showDevTools) {
      mainWindow.webContents.openDevTools();
    }
  } else {
    // Production mode - load from build folder
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    // Never open DevTools in production unless explicitly requested
    if (showDevTools) {
      mainWindow.webContents.openDevTools();
    }
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Set initial login menu
    setLoginMenu();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Add keyboard shortcut to toggle DevTools (F12 or Ctrl+Shift+I)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.key === 'F12') || 
        (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });

  // Initialize database asynchronously
  db.initialize().then(() => {
    console.log('✅ Base de datos MySQL inicializada correctamente');
  }).catch(err => {
    console.error('❌ Error inicializando base de datos MySQL:', err);
    dialog.showErrorBox('Error de Base de Datos', 
      'No se pudo conectar a la base de datos MySQL.\n\n' +
      'Verifique que MySQL esté corriendo y la configuración sea correcta.\n\n' +
      'Error: ' + err.message
    );
  });
}

// IPC handlers for authentication
ipcMain.handle('login', async (event, { usuario, password }) => {
  const authService = new AuthService();
  const result = await authService.login(usuario, password);
  
  if (result.success) {
    currentUser = result.user;
  }
  
  return result;
});

ipcMain.handle('get-current-user', () => {
  return currentUser;
});

ipcMain.handle('logout', () => {
  currentUser = null;
  return { success: true };
});

// IPC handlers for MySQL configuration
ipcMain.handle('test-mysql-connection', async (event, config) => {
  try {
    const { testConnection } = require('../src/database/mysql-config');
    const result = await testConnection(config);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Error al probar conexión'
    };
  }
});

ipcMain.handle('save-mysql-config', async (event, config) => {
  try {
    const { saveConfig } = require('../src/database/mysql-config');
    await saveConfig(config);
    
    return {
      success: true,
      message: 'Configuración guardada correctamente'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Error al guardar configuración'
    };
  }
});

ipcMain.handle('get-mysql-config', async () => {
  try {
    const { loadConfig } = require('../src/database/mysql-config');
    const config = loadConfig();
    return {
      success: true,
      config: config
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Error al cargar configuración'
    };
  }
});

// Handler para reiniciar la aplicación
ipcMain.handle('relaunch-app', () => {
  app.relaunch();
  app.exit(0);
});

// ============================================
// HANDLERS IPC PARA CONFIGURACIÓN DE IMPRESIÓN
// ============================================

// Handler para obtener lista de impresoras disponibles
ipcMain.handle('get-printers', async (event) => {
  try {
    const printers = await event.sender.getPrintersAsync();
    return {
      success: true,
      printers: printers
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Error al obtener impresoras'
    };
  }
});

// Handler para guardar configuración de impresión
ipcMain.handle('save-printer-config', async (event, printerConfig) => {
  try {
    console.log('💾 Guardando configuración de impresión:', printerConfig);
    
    const configPath = path.join(process.cwd(), 'config.json');
    let config = {};
    
    // Leer configuración existente
    if (fs.existsSync(configPath)) {
      const configFile = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(configFile);
    }
    
    // Agregar/actualizar configuración de impresora
    config.printer = printerConfig;
    
    console.log('💾 Configuración completa a guardar:', JSON.stringify(config, null, 2));
    
    // Guardar configuración
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    
    console.log('✅ Configuración guardada exitosamente');
    
    return {
      success: true,
      message: 'Configuración de impresión guardada correctamente'
    };
  } catch (error) {
    console.error('❌ Error al guardar configuración:', error);
    return {
      success: false,
      error: error.message || 'Error al guardar configuración de impresión'
    };
  }
});

// Handler para cargar configuración de impresión
ipcMain.handle('get-printer-config', async () => {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    
    if (fs.existsSync(configPath)) {
      const configFile = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configFile);
      
      if (config.printer) {
        console.log('📖 Configuración de impresión cargada:', config.printer);
        return {
          success: true,
          config: config.printer
        };
      }
    }
    
    console.log('⚠️ No hay configuración guardada, usando valores por defecto');
    
    // Retornar configuración por defecto si no existe
    return {
      success: true,
      config: {
        deviceName: '',
        silent: false,
        printBackground: true,
        color: false,
        margin: {
          marginType: 'default'
        },
        landscape: false,
        pagesPerSheet: 1,
        collate: false,
        copies: 1,
        pageSize: 'A4',
        customWidth: 80,
        customHeight: 200
      }
    };
  } catch (error) {
    console.error('❌ Error al cargar configuración:', error);
    return {
      success: false,
      error: error.message || 'Error al cargar configuración de impresión'
    };
  }
});

// IPC handlers for menu management
ipcMain.handle('set-menu', (event, role) => {
  switch (role) {
    case 'admin':
      setAdminMenu();
      break;
    case 'vendedor':
      setVendedorMenu();
      break;
    default:
      setLoginMenu();
  }
  return { success: true };
});

// IPC handlers for dialogs (fix focus bug)
ipcMain.handle('show-message', async (event, options) => {
  try {
    const result = await dialog.showMessageBox(mainWindow, {
      type: options.type || 'info', // 'none', 'info', 'error', 'question', 'warning'
      title: options.title || 'Mensaje',
      message: options.message || '',
      buttons: options.buttons || ['OK'],
      defaultId: options.defaultId || 0,
      cancelId: options.cancelId,
      noLink: true
    });
    return result;
  } catch (error) {
    console.error('Error showing message:', error);
    return { response: 0 };
  }
});

ipcMain.handle('show-confirm', async (event, options) => {
  try {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: options.title || 'Confirmación',
      message: options.message || '¿Está seguro?',
      buttons: ['Cancelar', 'Aceptar'],
      defaultId: 1,
      cancelId: 0,
      noLink: true
    });
    return result.response === 1; // true si presionó "Aceptar"
  } catch (error) {
    console.error('Error showing confirm:', error);
    return false;
  }
});

// IPC handlers for ticket types
// IPC handler para obtener todos los cierres de caja
ipcMain.handle('getAllCashClosures', async () => {
  try {
    return await db.getAllCashClosures();
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al obtener los cierres de caja' 
    };
  }
});

// IPC handler para crear un nuevo cierre de caja
ipcMain.handle('createCashClosure', async (event, data) => {
  try {
    const result = await db.createCashClosure(data);
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al crear el cierre de caja' 
    };
  }
});
// IPC handler para actualizar cierre de caja existente
ipcMain.handle('updateCashClosure', async (event, data) => {
  try {
    const result = await db.updateCashClosure(data);
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al actualizar el cierre de caja' 
    };
  }
});

// IPC handler para crear o actualizar cierre de caja (upsert)
ipcMain.handle('upsertCashClosure', async (event, data) => {
  try {
    const result = await db.upsertCashClosure(data);
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al guardar el cierre de caja' 
    };
  }
});

// IPC handler para obtener cierre de caja por fecha y usuario
ipcMain.handle('getCashClosureByDateAndUser', async (event, usuario_id, fecha_inicio) => {
  try {
    return await db.getCashClosureByDateAndUser(usuario_id, fecha_inicio);
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al obtener el cierre de caja' 
    };
  }
});

// IPC handler para obtener todos los cierres de una fecha específica (para admin)
ipcMain.handle('getAllCashClosuresByDate', async (event, fecha) => {
  try {
    return await db.getAllCashClosuresByDate(fecha);
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al obtener los cierres de caja de la fecha' 
    };
  }
});

// IPC handler para cerrar un cierre de caja
ipcMain.handle('closeCashClosure', async (event, cierreId) => {
  try {
    const result = await db.closeCashClosure(cierreId);
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al cerrar el cierre de caja' 
    };
  }
});

// IPC handler para reabrir un cierre de caja cerrado
ipcMain.handle('reopenCashClosure', async (event, cierreId) => {
  try {
    const result = await db.reopenCashClosure(cierreId);
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al reabrir el cierre de caja' 
    };
  }
});

// IPC handler para obtener todas las ventas del día (admin)
ipcMain.handle('getAllDailySales', async () => {
  try {
    return await db.getAllDailySales();
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al obtener las ventas del día' 
    };
  }
});

// IPC handler para anular una venta
ipcMain.handle('annulSale', async (event, ventaId) => {
  try {
    const result = await db.annulSale(ventaId);
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al anular la venta' 
    };
  }
});

ipcMain.handle('annulTicket', async (event, ticketId) => {
  try {
    const result = await db.annulTicket(ticketId);
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al anular el ticket' 
    };
  }
});

// IPC handlers para usuarios
ipcMain.handle('getUsers', async () => {
  try {
    return await db.getUsers();
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al obtener los usuarios' 
    };
  }
});

ipcMain.handle('createUser', async (event, data) => {
  try {
    const result = await db.createUser(data, currentUser);
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al crear el usuario' 
    };
  }
});

ipcMain.handle('updateUser', async (event, data) => {
  try {
    const result = await db.updateUser(data, currentUser);
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al actualizar el usuario' 
    };
  }
});

ipcMain.handle('changeUserPassword', async (event, id, newPassword) => {
  try {
    const result = await db.changeUserPassword(id, newPassword, currentUser);
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al cambiar la contraseña' 
    };
  }
});

ipcMain.handle('toggleUserStatus', async (event, id, active) => {
  try {
    const result = await db.toggleUserStatus(id, active, currentUser);
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al cambiar el estado del usuario' 
    };
  }
});

ipcMain.handle('deleteUser', async (event, id) => {
  try {
    const result = await db.deleteUser(id, currentUser);
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al eliminar el usuario' 
    };
  }
});
ipcMain.handle('getTicketTypes', async () => {
  try {
    return await db.getTicketTypes();
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al obtener los tipos de ticket' 
    };
  }
});

// Get active ticket types
ipcMain.handle('getActiveTicketTypes', async () => {
  try {
    return await db.getActiveTicketTypes();
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al obtener los tipos de ticket activos' 
    };
  }
});

ipcMain.handle('createTicketType', async (event, data) => {
  try {
    const result = await db.createTicketType(data);
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al crear el tipo de ticket' 
    };
  }
});

ipcMain.handle('updateTicketType', async (event, data) => {
  try {
    const result = await db.updateTicketType(data);
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al actualizar el tipo de ticket' 
    };
  }
});

ipcMain.handle('toggleTicketTypeStatus', async (event, id, active) => {
  try {
    const result = await db.toggleTicketTypeStatus(id, active);
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al cambiar el estado del tipo de ticket' 
    };
  }
});

ipcMain.handle('deleteTicketType', async (event, id) => {
  try {
    const result = await db.deleteTicketType(id);
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al eliminar el tipo de ticket' 
    };
  }
});

ipcMain.handle('createSale', async (event, ticketTypeId, amount, qrCode, puertaCodigo) => {
  // Acepta el código QR y puerta_codigo generado en el frontend
  try {
    console.log('🎫 IPC createSale - Recibido:', { ticketTypeId, amount, qrCode, puertaCodigo });
    
    if (!currentUser) {
      console.error('❌ IPC createSale - No hay usuario autenticado');
      return { 
        success: false, 
        error: 'No hay usuario autenticado' 
      };
    }

    console.log('✅ IPC createSale - Usuario autenticado:', currentUser.id, currentUser.usuario);

    // Convertir amount a número si viene como string (MySQL DECIMAL)
    const amountNumber = typeof amount === 'string' ? parseFloat(amount) : amount;
    const ticketTypeIdNumber = typeof ticketTypeId === 'string' ? parseInt(ticketTypeId) : ticketTypeId;

    if (typeof ticketTypeIdNumber !== 'number' || typeof amountNumber !== 'number' || typeof qrCode !== 'string') {
      console.error('❌ IPC createSale - Datos inválidos después de conversión:', { 
        ticketTypeId: typeof ticketTypeIdNumber, 
        amount: typeof amountNumber, 
        qrCode: typeof qrCode 
      });
      return { 
        success: false, 
        error: 'Datos de venta inválidos' 
      };
    }
    if (!ticketTypeIdNumber || !amountNumber || !qrCode) {
      console.error('❌ IPC createSale - Datos incompletos:', { ticketTypeId: ticketTypeIdNumber, amount: amountNumber, qrCode });
      return { 
        success: false, 
        error: 'Datos de venta incompletos' 
      };
    }

    console.log('✅ IPC createSale - Validaciones OK, llamando a db.createSale...', {
      userId: parseInt(currentUser.id, 10),
      ticketTypeId: ticketTypeIdNumber,
      amount: amountNumber,
      qrCode,
      puertaCodigo: puertaCodigo || null
    });

    const result = await db.createSale(
      parseInt(currentUser.id, 10),
      ticketTypeIdNumber,
      amountNumber,
      qrCode,
      puertaCodigo || null
    );
    
    console.log('✅ IPC createSale - Resultado exitoso:', result);
    return { success: true, ...result };
  } catch (error) {
    console.error('❌ IPC createSale - Error capturado:', error);
    return { 
      success: false, 
      error: error.message || 'Error al crear la venta' 
    };
  }
});

// Handler para confirmar que un ticket fue impreso
ipcMain.handle('confirmarImpresion', async (event, ventaId) => {
  try {
    if (!currentUser) {
      return { 
        success: false, 
        error: 'No hay usuario autenticado' 
      };
    }

    if (typeof ventaId !== 'number' || !ventaId) {
      return { 
        success: false, 
        error: 'ID de venta inválido' 
      };
    }

    const result = await db.marcarTicketComoImpreso(ventaId);
    return { 
      success: true, 
      ...result 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al confirmar la impresión del ticket' 
    };
  }
});

// Get daily sales for current user
ipcMain.handle('getDailySales', async () => {
  try {
    if (!currentUser) {
      return { 
        success: false, 
        error: 'No hay usuario autenticado' 
      };
    }
    return await db.getDailySales(currentUser.id);
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al obtener las ventas del día' 
    };
  }
});

// Get daily sales summary for specific vendor
ipcMain.handle('getVendedorDailySummary', async (event, fecha = null) => {
  try {
    if (!currentUser) {
      return { 
        success: false, 
        error: 'No hay usuario autenticado' 
      };
    }
    return await db.getVendedorDailySummary(currentUser.id, fecha);
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al obtener el resumen de ventas del día' 
    };
  }
});

// IPC handler para obtener resumen de ventas de un usuario específico (para admin)
ipcMain.handle('getVendedorDailySummaryByUser', async (event, userId, fecha = null) => {
  try {
    if (!currentUser) {
      return { 
        success: false, 
        error: 'No hay usuario autenticado' 
      };
    }
    // Solo admin puede consultar ventas de otros usuarios
    if (currentUser.rol !== 'admin' && currentUser.id !== userId) {
      return { 
        success: false, 
        error: 'No autorizado para ver ventas de otros usuarios' 
      };
    }
    return await db.getVendedorDailySummary(userId, fecha);
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al obtener el resumen de ventas del usuario' 
    };
  }
});

// IPC handlers para logs de configuración
ipcMain.handle('obtener-config-logs', async (event, filtros = {}) => {
  try {
    return await db.obtenerLogsConfig(filtros);
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al obtener los logs de configuración' 
    };
  }
});

ipcMain.handle('contar-config-logs', async (event, filtros = {}) => {
  try {
    return await db.contarLogsConfig(filtros);
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al contar los logs de configuración' 
    };
  }
});

ipcMain.handle('obtener-estadisticas-logs', async () => {
  try {
    return await db.obtenerEstadisticasLogs();
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al obtener las estadísticas de logs' 
    };
  }
});

ipcMain.handle('obtener-historial-registro', async (event, tabla, registro_id) => {
  try {
    return await db.obtenerHistorialRegistro(tabla, registro_id);
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al obtener el historial del registro' 
    };
  }
});

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Manejador de impresión de tickets
ipcMain.handle('print-ticket', async (event, html) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Cargar configuración de impresión
      const configPath = path.join(process.cwd(), 'config.json');
      let printerConfig = null;
      let useSilentPrint = false;
      
      if (fs.existsSync(configPath)) {
        const configFile = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configFile);
        if (config.printer && config.printer.deviceName) {
          printerConfig = config.printer;
          useSilentPrint = config.printer.silent === true;
        }
      }

      let ticketsImpresos = false;
      
      // Crear ventana de vista previa
      const printWindow = new BrowserWindow({
        width: 400,
        height: 600,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.js')
        },
        title: 'Vista previa de impresión',
        closable: false,
        autoHideMenuBar: true,
        skipTaskbar: false
      });

      printWindow.setMenu(null);

      // HTML con botón de impresión
      const htmlContent = `
        ${html}
        <style>
          .print-buttons {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 24px;
            background: linear-gradient(to top, rgba(255,255,255,0.95), rgba(255,255,255,0.8));
            backdrop-filter: blur(10px);
            border-top: 1px solid rgba(29, 50, 77, 0.08);
            display: flex;
            justify-content: center;
            z-index: 9999;
          }
          .print-button {
            padding: 12px 40px;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: linear-gradient(135deg, #457373 0%, #1D324D 100%);
            color: white;
            box-shadow: 0 2px 8px rgba(69, 115, 115, 0.15);
            transition: all 0.3s ease;
          }
          .print-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(69, 115, 115, 0.25);
          }
          .print-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          @media print {
            .print-buttons { display: none !important; }
          }
        </style>
        <div class="print-buttons">
          <button class="print-button" id="printButton">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            <span>Imprimir Tickets</span>
          </button>
        </div>
      `;

      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      printWindow.on('closed', () => {
        resolve({ success: ticketsImpresos });
      });

      printWindow.webContents.on('did-finish-load', () => {
        // Helper para tamaños de papel personalizados (térmicos)
        const getPageSizeConfig = (pageSize, customWidth, customHeight) => {
          // Si es tamaño personalizado, usar customWidth y customHeight
          if (pageSize === 'Custom' && customWidth && customHeight) {
            return {
              width: customWidth * 1000,  // Convertir mm a micrómetros
              height: customHeight * 1000
            };
          }
          
          // Tamaños predefinidos
          const customSizes = {
            '80mm': { width: 80000, height: 297000 },
            '58mm': { width: 58000, height: 210000 },
            'Custom57x105': { width: 57000, height: 105000 },
            'Custom80x150': { width: 80000, height: 150000 },
            'Custom80x200': { width: 80000, height: 200000 },
            'Custom80x80': { width: 80000, height: 80000 },
            'Custom100x150': { width: 100000, height: 150000 },
            'Custom100x100': { width: 100000, height: 100000 },
            'Custom50x30': { width: 50000, height: 30000 }
          };
          return customSizes[pageSize] || null;
        };

        if (useSilentPrint && printerConfig) {
          // ===== MODO SILENCIOSO =====
          // Configurar botón para disparar impresión automática
          printWindow.webContents.executeJavaScript(`
            const btn = document.getElementById('printButton');
            if (btn) {
              btn.onclick = (e) => {
                e.preventDefault();
                btn.disabled = true;
                btn.textContent = 'Imprimiendo...';
                window.electronAPI.triggerPrint();
              };
            }
          `);

          // Handler IPC temporal para esta ventana
          const printHandler = () => {
            const printOptions = {
              silent: true,
              printBackground: true,
              color: printerConfig.color === true,
              deviceName: printerConfig.deviceName,
              copies: printerConfig.copies || 1,
              landscape: printerConfig.landscape === true
            };

            console.log('📋 Configuración de impresión recibida:', {
              pageSize: printerConfig.pageSize,
              customWidth: printerConfig.customWidth,
              customHeight: printerConfig.customHeight
            });

            // Determinar el tamaño de página
            const customSize = getPageSizeConfig(
              printerConfig.pageSize, 
              printerConfig.customWidth, 
              printerConfig.customHeight
            );
            
            console.log('📐 Tamaño calculado:', customSize);
            
            if (customSize) {
              // Si hay un tamaño personalizado (objeto con width/height), usarlo
              printOptions.pageSize = customSize;
              console.log('✅ Usando tamaño personalizado:', customSize);
            } else if (printerConfig.pageSize && printerConfig.pageSize !== 'Custom') {
              // Si es un tamaño estándar de Electron (A4, Letter, etc.)
              printOptions.pageSize = printerConfig.pageSize;
              console.log('✅ Usando tamaño estándar:', printerConfig.pageSize);
            } else {
              // Fallback a A4
              printOptions.pageSize = 'A4';
              console.log('⚠️ Usando fallback A4');
            }

            if (printerConfig.margin) {
              printOptions.margins = printerConfig.margin;
            }

            console.log('🖨️ Opciones finales de impresión:', printOptions);

            // Imprimir sin diálogo del sistema
            printWindow.webContents.print(printOptions, (success, errorType) => {
              ticketsImpresos = success;
              if (!success) {
                console.error('Error de impresión:', errorType);
              }
              
              // Limpiar handler temporal
              ipcMain.removeHandler('trigger-print-now');
              
              // Cerrar ventana automáticamente
              setTimeout(() => {
                if (printWindow && !printWindow.isDestroyed()) {
                  printWindow.destroy();
                }
              }, 500);
            });
          };

          ipcMain.handle('trigger-print-now', printHandler);

        } else {
          // ===== MODO CON DIÁLOGO =====
          // Configurar botón para abrir diálogo de impresión del sistema
          printWindow.webContents.executeJavaScript(`
            let printing = false;
            const btn = document.getElementById('printButton');
            
            if (btn) {
              btn.onclick = (e) => {
                e.preventDefault();
                if (!printing) {
                  printing = true;
                  btn.disabled = true;
                  btn.textContent = 'Imprimiendo...';
                  window.print();
                }
              };
            }

            // Cerrar ventana después de imprimir
            window.addEventListener('afterprint', () => {
              window.ticketsImpresos = true;
              setTimeout(() => window.close(), 500);
            });
          `);
          
          // Timeout de seguridad (30 segundos)
          setTimeout(() => {
            if (printWindow && !printWindow.isDestroyed()) {
              printWindow.destroy();
            }
          }, 30000);
        }
      });

    } catch (error) {
      reject(error);
    }
  });
});

// ============================================
// HANDLERS IPC PARA PUERTAS
// ============================================

ipcMain.handle('getPuertas', async () => {
  try {
    return await db.getPuertas();
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al obtener las puertas' 
    };
  }
});

ipcMain.handle('getActivePuertas', async () => {
  try {
    return await db.getActivePuertas();
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al obtener las puertas activas' 
    };
  }
});

ipcMain.handle('createPuerta', async (event, data) => {
  try {
    const result = await db.createPuerta(data);
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al crear la puerta' 
    };
  }
});

ipcMain.handle('updatePuerta', async (event, data) => {
  try {
    const result = await db.updatePuerta(data);
    // Notificar a control-acceso-qr para recargar config
    notificarRecargaConfig();
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al actualizar la puerta' 
    };
  }
});

ipcMain.handle('togglePuertaStatus', async (event, id, active) => {
  try {
    const result = await db.togglePuertaStatus(id, active);
    // Notificar a control-acceso-qr para recargar config
    notificarRecargaConfig();
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al cambiar el estado de la puerta' 
    };
  }
});

ipcMain.handle('deletePuerta', async (event, id) => {
  try {
    const result = await db.deletePuerta(id);
    // Notificar a control-acceso-qr para recargar config
    notificarRecargaConfig();
    return { success: true, ...result };
  } catch (error) {
    // Retornar error como objeto en lugar de lanzar excepción
    // Esto evita que Electron muestre stack traces técnicos
    return { 
      success: false, 
      error: error.message || 'Error al eliminar la puerta' 
    };
  }
});

// ============================================
// CONFIGURACIÓN DEL RELAY X-410
// ============================================

ipcMain.handle('getConfigRelay', async () => {
  try {
    return await db.getConfigRelay();
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al obtener la configuración del relay' 
    };
  }
});

ipcMain.handle('updateConfigRelay', async (event, data) => {
  try {
    const result = await db.updateConfigRelay(data);
    // Notificar a control-acceso-qr para recargar config
    notificarRecargaConfig();
    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al actualizar la configuración del relay' 
    };
  }
});

// ============================================
// CONTROL DE ACCESO QR - LOGS Y SERVICIO
// ============================================

/**
 * Obtiene los logs del servicio de control de acceso
 */
ipcMain.handle('getControlAccesoLogs', async (event, logType, maxLines) => {
  try {
    const logsPath = 'C:\\Program Files\\Sistema Tickets\\logs';
    const fileName = logType === 'errores' ? 'errores.log' : 'accesos.log';
    const filePath = path.join(logsPath, fileName);
    
    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    // Leer el archivo
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    // Tomar las últimas N líneas
    const lastLines = lines.slice(-maxLines);
    
    // Parsear cada línea al formato esperado
    const logs = lastLines.map(line => {
      // Formato esperado: [2026-01-08 10:30:45] LEVEL: mensaje
      const match = line.match(/^\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\]\s*(\w+):\s*(.*)$/);
      
      if (match) {
        return {
          timestamp: match[1],
          level: match[2],
          message: match[3]
        };
      }
      
      // Si no coincide, intentar otro formato: [HH:mm:ss] level: mensaje
      const match2 = line.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(\w+):\s*(.*)$/);
      if (match2) {
        return {
          timestamp: match2[1],
          level: match2[2],
          message: match2[3]
        };
      }
      
      // Si no coincide con ningún formato, devolver la línea completa
      return {
        timestamp: '',
        level: 'INFO',
        message: line
      };
    });
    
    return logs;
  } catch (error) {
    console.error('Error leyendo logs de control de acceso:', error);
    return [];
  }
});

/**
 * Obtiene el estado del servicio de control de acceso
 */
ipcMain.handle('getControlAccesoStatus', async () => {
  try {
    // Intentar conectar a la API del servicio
    const response = await axios.get('http://localhost:3002/api/health', { timeout: 2000 });
    return {
      running: response.status === 200,
      uptime: response.data?.uptime || 0,
      conectado: true
    };
  } catch (error) {
    return {
      running: false,
      conectado: false
    };
  }
});

/**
 * Reinicia el servicio de control de acceso
 */
ipcMain.handle('restartControlAccesoService', async () => {
  try {
    const { exec } = require('child_process');
    
    return new Promise((resolve) => {
      // Primero detener el servicio
      exec('sc stop ControlAccesoQR', (stopError) => {
        // Esperar un poco antes de reiniciar
        setTimeout(() => {
          exec('sc start ControlAccesoQR', (startError, stdout, stderr) => {
            if (startError) {
              // Intentar como proceso normal si no es un servicio
              const exePath = 'C:\\Program Files\\Sistema Tickets\\control-acceso-qr.exe';
              if (fs.existsSync(exePath)) {
                exec(`taskkill /F /IM control-acceso-qr.exe`, () => {
                  setTimeout(() => {
                    exec(`start "" "${exePath}"`, { windowsHide: true });
                    resolve({ success: true });
                  }, 1000);
                });
              } else {
                resolve({ success: false, error: 'Ejecutable no encontrado' });
              }
            } else {
              resolve({ success: true });
            }
          });
        }, 2000);
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Limpia los logs del servicio de control de acceso
 */
ipcMain.handle('clearControlAccesoLogs', async (event, logType) => {
  try {
    const logsPath = 'C:\\Program Files\\Sistema Tickets\\logs';
    const fileName = logType === 'errores' ? 'errores.log' : 'accesos.log';
    const filePath = path.join(logsPath, fileName);
    
    // Verificar si el archivo existe
    if (fs.existsSync(filePath)) {
      // Escribir archivo vacío (mantener el archivo pero sin contenido)
      fs.writeFileSync(filePath, '');
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==================== IPC HANDLERS PARA BOTONES DE IMPRESIÓN ====================

/**
 * Obtener configuración de un botón específico
 */
ipcMain.handle('obtenerBotonPorInput', async (event, input_numero) => {
  try {
    const boton = await db.obtenerBotonPorInput(input_numero);
    return boton;
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Error al obtener la configuración del botón' 
    };
  }
});

// ==================== SERVIDOR HTTP PARA RECIBIR TRIGGERS DE BOTONES ====================

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const httpApp = express();
const HTTP_PORT = 3001;

// Middleware
httpApp.use(cors());
httpApp.use(bodyParser.json());
httpApp.use(bodyParser.urlencoded({ extended: true }));

/**
 * Endpoint para recibir triggers de botones físicos desde control-acceso-qr
 * POST /api/botones/trigger
 * Body: { input: number }
 */
httpApp.post('/api/botones/trigger', async (req, res) => {
  const { input } = req.body;

  try {
    // Validar input
    if (!input || input < 1 || input > 4) {
      return res.status(400).json({
        success: false,
        error: 'Input inválido. Debe ser entre 1 y 4'
      });
    }

    // Obtener configuración del botón
    const config = await db.obtenerBotonPorInput(input);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Input ${input} no está configurado`
      });
    }

    if (!config.activo) {
      return res.status(400).json({
        success: false,
        error: `Input ${input} está desactivado`
      });
    }

    // Crear venta automática
    const QRCode = require('qrcode');
    const crypto = require('crypto');

    const ventaId = Date.now(); // ID temporal basado en timestamp
    const tickets = [];

    // Generar tickets
    for (let i = 0; i < config.cantidad; i++) {
      const randomString = crypto.randomBytes(16).toString('hex');
      const qrData = `TICKET-${ventaId}-${i + 1}-${randomString}`;
      const qrCode = await QRCode.toDataURL(qrData);

      tickets.push({
        qrCode,
        qrData,
        tipoTicketId: config.tipo_ticket_id,
        precio: config.tipo_ticket_precio
      });
    }

    // Guardar venta en la base de datos
    const usuarioSistema = 1;
    const totalVenta = config.tipo_ticket_precio * config.cantidad;

    // Crear la venta
    const venta = await new Promise((resolve, reject) => {
      db.db.run(
        `INSERT INTO ventas (usuario_id, total, fecha_venta, anulada)
         VALUES (?, ?, datetime('now', 'localtime'), 0)`,
        [usuarioSistema, totalVenta],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, total: totalVenta });
        }
      );
    });

    const ventaIdReal = venta.id;

    // Insertar tickets en la base de datos
    for (const ticket of tickets) {
      await new Promise((resolve, reject) => {
        db.db.run(
          `INSERT INTO tickets (venta_id, tipo_ticket_id, codigo_qr, puerta_codigo, precio, fecha_creacion, anulado, usado, impreso)
           VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), 0, 0, 0)`,
          [
            ventaIdReal,
            ticket.tipoTicketId,
            ticket.qrData,
            config.puerta_id ? `P${config.puerta_id}` : 'GENERAL',
            ticket.precio
          ],
          function (err) {
            if (err) reject(err);
            else resolve({ ticketId: this.lastID });
          }
        );
      });
    }

    // Log compacto en una línea
    const ahora = new Date().toLocaleTimeString('es-ES');
    console.log(`[${ahora}] IN${input}: ${config.tipo_ticket_nombre} x${config.cantidad} ($${totalVenta.toFixed(2)}) Venta#${ventaIdReal} - Impreso`);

    // Marcar tickets como impresos (modo simulación)
    try {
      await db.marcarTicketComoImpreso(ventaIdReal);
    } catch (err) {
      console.error(`[${ahora}] Error marcando impresos:`, err.message);
    }

    // Enviar tickets a imprimir (para cuando tengas impresora física)
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Generar HTML para impresión
      const ticketsHtml = tickets.map((ticket, index) => `
        <div style="width: 80mm; margin: 0 auto; padding: 10mm; page-break-after: always;">
          <div style="text-align: center; font-family: Arial, sans-serif;">
            <h2 style="margin: 0 0 5mm 0; font-size: 18pt;">🎫 ${config.tipo_ticket_nombre}</h2>
            <p style="margin: 2mm 0; font-size: 10pt; color: #666;">Ticket ${index + 1} de ${config.cantidad}</p>
            <img src="${ticket.qrCode}" style="width: 40mm; height: 40mm; margin: 5mm 0;" />
            <p style="margin: 2mm 0; font-size: 9pt; font-family: monospace;">${ticket.qrData.substring(0, 30)}...</p>
            <div style="margin-top: 5mm; padding-top: 3mm; border-top: 2px dashed #ccc;">
              <p style="margin: 1mm 0; font-size: 12pt;"><strong>Precio: $${ticket.precio.toFixed(2)}</strong></p>
              <p style="margin: 1mm 0; font-size: 8pt; color: #999;">Venta #${ventaIdReal}</p>
              <p style="margin: 1mm 0; font-size: 8pt; color: #999;">${new Date().toLocaleString('es-ES')}</p>
              <p style="margin: 3mm 0 0 0; font-size: 7pt; color: #999;">🤖 Impresión automática - Input ${input}</p>
            </div>
          </div>
        </div>
      `).join('');

      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Tickets - Venta ${ventaIdReal}</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          ${ticketsHtml}
        </body>
        </html>
      `;

      /* 
      // ============================================
      // DESCOMENTAR CUANDO TENGAS IMPRESORA FÍSICA
      // ============================================
      try {
        mainWindow.webContents.print(
          {
            silent: false, // Mostrar diálogo de impresión
            printBackground: true,
            margins: { marginType: 'none' }
          },
          async (success, errorType) => {
            if (success) {
              console.log(`[TRIGGER] ✅ Tickets impresos exitosamente`);
              
              // Marcar tickets como impresos
              try {
                await db.marcarTicketComoImpreso(ventaIdReal);
                console.log(`[TRIGGER] ✅ Tickets marcados como impresos en la BD`);
              } catch (err) {
                console.error(`[TRIGGER] ❌ Error al marcar como impresos:`, err);
              }
            } else {
              console.error(`[TRIGGER] ❌ Error al imprimir:`, errorType);
            }
          }
        );
      } catch (printError) {
        console.error(`[TRIGGER] ❌ Error en impresión:`, printError);
      }
      */
    }

    // Responder al trigger
    res.json({
      success: true,
      message: `Venta creada e impresión iniciada`,
      data: {
        ventaId: ventaIdReal,
        input,
        tipo_ticket: config.tipo_ticket_nombre,
        cantidad: config.cantidad,
        total: totalVenta,
        tickets_generados: tickets.length
      }
    });

  } catch (error) {
    console.error(`[TRIGGER] Error procesando trigger:`, error);
    res.status(500).json({
      success: false,
      error: 'Error interno al procesar el trigger',
      details: error.message
    });
  }
});

// Health check endpoint
httpApp.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor HTTP de qr_tickets activo',
    port: HTTP_PORT,
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor HTTP
let httpServer;
app.whenReady().then(() => {
  const iniciarServidor = (puerto) => {
    httpServer = httpApp.listen(puerto)
      .on('listening', () => {
        const ahora = new Date().toLocaleTimeString('es-ES');
        console.log(`[${ahora}] HTTP :${puerto}`);
      })
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          const ahora = new Date().toLocaleTimeString('es-ES');
          console.log(`[${ahora}] Puerto ${puerto} ocupado, reintentando en 3s...`);
          setTimeout(() => iniciarServidor(puerto), 3000);
        } else {
          console.error(`[${new Date().toLocaleTimeString('es-ES')}] Error servidor HTTP:`, err.message);
        }
      });
  };
  
  iniciarServidor(HTTP_PORT);
});

app.on('before-quit', () => {
  // Cerrar servidor HTTP
  if (httpServer) {
    httpServer.close();
  }
  
  // Cerrar base de datos
  if (db) {
    db.close();
  }
});