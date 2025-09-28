const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const Database = require('../src/database/database');
const AuthService = require('../src/services/authService');

// Keep a global reference of the window object
let mainWindow;
let db;
let currentUser = null;

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



  // Initialize database
  db = new Database();
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

// IPC handlers for ticket types
// IPC handler para obtener todos los cierres de caja
ipcMain.handle('getAllCashClosures', async () => {
  try {
    return await db.getAllCashClosures();
  } catch (error) {
    console.error('Error getting cash closures:', error);
    throw error;
  }
});

// IPC handler para crear un nuevo cierre de caja
ipcMain.handle('createCashClosure', async (event, data) => {
  try {
    return await db.createCashClosure(data);
  } catch (error) {
    console.error('Error creating cash closure:', error);
    throw error;
  }
});
// IPC handler para actualizar cierre de caja existente
ipcMain.handle('updateCashClosure', async (event, data) => {
  try {
    return await db.updateCashClosure(data);
  } catch (error) {
    console.error('Error updating cash closure:', error);
    throw error;
  }
});

// IPC handler para crear o actualizar cierre de caja (upsert)
ipcMain.handle('upsertCashClosure', async (event, data) => {
  try {
    return await db.upsertCashClosure(data);
  } catch (error) {
    console.error('Error upserting cash closure:', error);
    throw error;
  }
});

// IPC handler para obtener cierre de caja por fecha y usuario
ipcMain.handle('getCashClosureByDateAndUser', async (event, usuario_id, fecha_inicio) => {
  try {
    return await db.getCashClosureByDateAndUser(usuario_id, fecha_inicio);
  } catch (error) {
    console.error('Error getting cash closure by date and user:', error);
    throw error;
  }
});
// IPC handler para obtener todas las ventas del día (admin)
ipcMain.handle('getAllDailySales', async () => {
  try {
    return await db.getAllDailySales();
  } catch (error) {
    console.error('Error getting all daily sales:', error);
    throw error;
  }
});

// IPC handler para anular una venta
ipcMain.handle('annulSale', async (event, ventaId) => {
  try {
    return await db.annulSale(ventaId);
  } catch (error) {
    console.error('Error annulling sale:', error);
    throw error;
  }
});
// IPC handlers para usuarios
ipcMain.handle('getUsers', async () => {
  try {
    return await db.getUsers();
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
});

ipcMain.handle('createUser', async (event, data) => {
  try {
    return await db.createUser(data);
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
});

ipcMain.handle('updateUser', async (event, data) => {
  try {
    return await db.updateUser(data);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
});

ipcMain.handle('changeUserPassword', async (event, id, newPassword) => {
  try {
    return await db.changeUserPassword(id, newPassword);
  } catch (error) {
    console.error('Error changing user password:', error);
    throw error;
  }
});

ipcMain.handle('toggleUserStatus', async (event, id, active) => {
  try {
    return await db.toggleUserStatus(id, active);
  } catch (error) {
    console.error('Error toggling user status:', error);
    throw error;
  }
});

ipcMain.handle('deleteUser', async (event, id) => {
  try {
    return await db.deleteUser(id);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
});
ipcMain.handle('getTicketTypes', async () => {
  try {
    return await db.getTicketTypes();
  } catch (error) {
    console.error('Error getting ticket types:', error);
    throw error;
  }
});

// Get active ticket types
ipcMain.handle('getActiveTicketTypes', async () => {
  try {
    return await db.getActiveTicketTypes();
  } catch (error) {
    console.error('Error getting active ticket types:', error);
    throw error;
  }
});

ipcMain.handle('createTicketType', async (event, data) => {
  try {
    return await db.createTicketType(data);
  } catch (error) {
    console.error('Error creating ticket type:', error);
    throw error;
  }
});

ipcMain.handle('updateTicketType', async (event, data) => {
  try {
    return await db.updateTicketType(data);
  } catch (error) {
    console.error('Error updating ticket type:', error);
    throw error;
  }
});

ipcMain.handle('toggleTicketTypeStatus', async (event, id, active) => {
  try {
    return await db.toggleTicketTypeStatus(id, active);
  } catch (error) {
    console.error('Error toggling ticket type status:', error);
    throw error;
  }
});

ipcMain.handle('deleteTicketType', async (event, id) => {
  try {
    return await db.deleteTicketType(id);
  } catch (error) {
    console.error('Error deleting ticket type:', error);
    throw error;
  }
});

ipcMain.handle('createSale', async (event, ticketTypeId, amount, qrCode) => {
  // Acepta el código QR generado en el frontend
  try {
    console.log('=== DEBUG createSale ===');
    console.log('Argumentos recibidos:', arguments.length);
    console.log('arguments[0] (event):', typeof arguments[0]);
    console.log('arguments[1] (ticketTypeId):', arguments[1], 'tipo:', typeof arguments[1]);
    console.log('arguments[2] (amount):', arguments[2], 'tipo:', typeof arguments[2]);
    console.log('arguments[3] (qrCode):', arguments[3], 'tipo:', typeof arguments[3]);
    
    if (!currentUser) {
      throw new Error('No hay usuario autenticado');
    }

    // Los argumentos se reciben directamente como parámetros
    console.log('Parámetros recibidos:');
    console.log('ticketTypeId:', ticketTypeId, 'tipo:', typeof ticketTypeId);
    console.log('amount:', amount, 'tipo:', typeof amount);
    console.log('qrCode:', qrCode, 'tipo:', typeof qrCode);

    console.log('Validación de tipos:');
    console.log('ticketTypeId es number?', typeof ticketTypeId === 'number', 'valor:', ticketTypeId);
    console.log('amount es number?', typeof amount === 'number', 'valor:', amount);
    console.log('qrCode es string?', typeof qrCode === 'string', 'valor:', qrCode);
    
    console.log('Validación de valores truthy:');
    console.log('ticketTypeId truthy?', !!ticketTypeId);
    console.log('amount truthy?', !!amount);
    console.log('qrCode truthy?', !!qrCode);

    if (typeof ticketTypeId !== 'number' || typeof amount !== 'number' || typeof qrCode !== 'string') {
      console.log('ERROR: Fallo validación de tipos');
      throw new Error('Datos de venta inválidos');
    }
    if (!ticketTypeId || !amount || !qrCode) {
      console.log('ERROR: Fallo validación de valores');
      throw new Error('Datos de venta incompletos');
    }

    console.log('Validación pasada, creando venta...');

    const result = await db.createSale(
      parseInt(currentUser.id, 10),
      ticketTypeId,
      amount,
      qrCode
    );
    console.log('Venta creada exitosamente:', result);
    return result;
  } catch (error) {
    console.error('=== ERROR en createSale ===');
    console.error('Tipo de error:', error.constructor.name);
    console.error('Mensaje:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('currentUser:', currentUser ? { id: currentUser.id, username: currentUser.username } : 'null');
    console.error('Error detallado en createSale:', error);
    throw error;
  }
});

// Get daily sales for current user
ipcMain.handle('getDailySales', async () => {
  try {
    if (!currentUser) {
      throw new Error('No hay usuario autenticado');
    }
    return await db.getDailySales(currentUser.id);
  } catch (error) {
    console.error('Error getting daily sales:', error);
    throw error;
  }
});

// Get daily sales summary for specific vendor
ipcMain.handle('getVendedorDailySummary', async (event, fecha = null) => {
  try {
    if (!currentUser) {
      throw new Error('No hay usuario autenticado');
    }
    return await db.getVendedorDailySummary(currentUser.id, fecha);
  } catch (error) {
    console.error('Error getting vendor daily summary:', error);
    throw error;
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
  return new Promise((resolve, reject) => {
    try {
      let ticketsImpresos = false;
      
      // Crear una ventana visible para la impresión
      const printWindow = new BrowserWindow({
        width: 400,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.js')
        },
        title: 'Vista previa de impresión'
      });

      // Agregar solo los botones de impresión y cerrar, sin advertencia
      const htmlWithButtons = `
        ${html}
        <style>
          .print-buttons {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 15px;
            background: white;
            border-top: 1px solid #ccc;
            display: flex;
            justify-content: center;
            gap: 10px;
            z-index: 9999;
          }
          .print-button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          .print-now {
            background: #2563eb;
            color: white;
          }
          .print-cancel {
            background: #dc2626;
            color: white;
          }
          @media print {
            .print-buttons {
              display: none !important;
            }
          }
        </style>
        <div class="print-buttons">
          <button class="print-button print-now" onclick="window.print()">Imprimir Tickets</button>
          <button class="print-button print-cancel" onclick="if(window.ticketsImpresos || confirm('¿Está seguro que desea cerrar sin imprimir? Los tickets deberán ser generados nuevamente.')) window.close()">Cerrar</button>
        </div>
      `;

      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlWithButtons)}`);

      // Manejar cuando la ventana se cierre
      printWindow.on('close', (e) => {
        if (!ticketsImpresos) {
          const choice = require('electron').dialog.showMessageBoxSync(printWindow, {
            type: 'warning',
            buttons: ['Cerrar sin imprimir', 'Cancelar'],
            title: 'Confirmar cierre',
            message: '¿Está seguro que desea cerrar sin imprimir?',
            detail: 'Si cierra esta ventana sin imprimir, necesitará generar los tickets nuevamente.',
            defaultId: 1,
            cancelId: 1
          });

          if (choice === 1) {
            e.preventDefault();
            return;
          }
        }
      });

      printWindow.on('closed', () => {
        resolve({ success: ticketsImpresos });
      });

      // Agregar accesos directos de teclado y manejo de impresión
      printWindow.webContents.on('did-finish-load', () => {
        printWindow.webContents.executeJavaScript(`
          window.ticketsImpresos = false;
          window.addEventListener('afterprint', () => {
            window.ticketsImpresos = true;
          });
          document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'p') {
              e.preventDefault();
              window.print();
            }
            if (e.key === 'Escape') {
              if (window.ticketsImpresos || confirm('¿Está seguro que desea cerrar sin imprimir? Los tickets deberán ser generados nuevamente.')) {
                window.close();
              }
            }
          });
        `);
      });

    } catch (error) {
      reject(error);
    }
  });
});

app.on('before-quit', () => {
  if (db) {
    db.close();
  }
});