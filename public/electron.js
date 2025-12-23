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

// IPC handler para obtener todos los cierres de una fecha específica (para admin)
ipcMain.handle('getAllCashClosuresByDate', async (event, fecha) => {
  try {
    return await db.getAllCashClosuresByDate(fecha);
  } catch (error) {
    console.error('Error getting all cash closures by date:', error);
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

ipcMain.handle('createSale', async (event, ticketTypeId, amount, qrCode, puertaCodigo) => {
  // Acepta el código QR y puerta_codigo generado en el frontend
  try {
    if (!currentUser) {
      throw new Error('No hay usuario autenticado');
    }

    if (typeof ticketTypeId !== 'number' || typeof amount !== 'number' || typeof qrCode !== 'string') {
      throw new Error('Datos de venta inválidos');
    }
    if (!ticketTypeId || !amount || !qrCode) {
      throw new Error('Datos de venta incompletos');
    }

    const result = await db.createSale(
      parseInt(currentUser.id, 10),
      ticketTypeId,
      amount,
      qrCode,
      puertaCodigo || null
    );
    return result;
  } catch (error) {
    console.error('Error en createSale:', error);
    throw error;
  }
});

// Handler para confirmar que un ticket fue impreso
ipcMain.handle('confirmarImpresion', async (event, ventaId) => {
  try {
    if (!currentUser) {
      throw new Error('No hay usuario autenticado');
    }

    if (typeof ventaId !== 'number' || !ventaId) {
      throw new Error('ID de venta inválido');
    }

    const result = await db.marcarTicketComoImpreso(ventaId);
    return { 
      success: true, 
      ...result 
    };
  } catch (error) {
    console.error('Error al confirmar impresión:', error);
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

// IPC handler para obtener resumen de ventas de un usuario específico (para admin)
ipcMain.handle('getVendedorDailySummaryByUser', async (event, userId, fecha = null) => {
  try {
    if (!currentUser) {
      throw new Error('No hay usuario autenticado');
    }
    // Solo admin puede consultar ventas de otros usuarios
    if (currentUser.rol !== 'admin' && currentUser.id !== userId) {
      throw new Error('No autorizado para ver ventas de otros usuarios');
    }
    return await db.getVendedorDailySummary(userId, fecha);
  } catch (error) {
    console.error('Error getting vendor daily summary by user:', error);
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
      
      // Crear una ventana visible para la impresión sin botones de cerrar ni menú
      const printWindow = new BrowserWindow({
        width: 400,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.js')
        },
        title: 'Vista previa de impresión',
        closable: false,     // Deshabilitar el botón X de cerrar
        minimizable: true,   // Permitir minimizar
        maximizable: false,  // Deshabilitar maximizar
        autoHideMenuBar: true, // Ocultar barra de menú automáticamente
        skipTaskbar: false   // Mostrar en la barra de tareas para poder restaurar
      });

      // Remover completamente el menú de la ventana
      printWindow.setMenu(null);

      // Agregar solo el botón de impresión con diseño sutil y estético
      const htmlWithButtons = `
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
            align-items: center;
            z-index: 9999;
          }
          .print-button {
            position: relative;
            padding: 12px 40px;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            letter-spacing: 0.3px;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: linear-gradient(135deg, #457373 0%, #1D324D 100%);
            color: white;
            box-shadow: 0 2px 8px rgba(69, 115, 115, 0.15);
            overflow: hidden;
          }
          .print-button::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.15);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
          }
          .print-button:hover::before {
            width: 300px;
            height: 300px;
          }
          .print-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(69, 115, 115, 0.25);
          }
          .print-button:active {
            transform: translateY(0);
            box-shadow: 0 2px 8px rgba(69, 115, 115, 0.2);
          }
          .print-icon {
            position: relative;
            z-index: 1;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .print-text {
            position: relative;
            z-index: 1;
          }
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .print-buttons {
            animation: fadeIn 0.3s ease-out;
          }
          @media print {
            .print-buttons {
              display: none !important;
            }
          }
        </style>
        <div class="print-buttons">
          <button class="print-button" onclick="window.print()">
            <span class="print-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
            </span>
            <span class="print-text">Imprimir Tickets</span>
          </button>
        </div>
      `;

      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlWithButtons)}`);

      // La ventana se cierra automáticamente después de imprimir
      printWindow.on('closed', () => {
        resolve({ success: ticketsImpresos });
      });

      // Agregar manejo de impresión y cierre automático
      printWindow.webContents.on('did-finish-load', () => {
        printWindow.webContents.executeJavaScript(`
          window.ticketsImpresos = false;
          window.addEventListener('afterprint', () => {
            window.ticketsImpresos = true;
            // Cerrar ventana automáticamente después de imprimir
            setTimeout(() => {
              window.close();
            }, 500);
          });
          
          // Atajo de teclado Ctrl+P para imprimir
          document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'p') {
              e.preventDefault();
              window.print();
            }
          });
        `);
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
    console.error('Error getting puertas:', error);
    throw error;
  }
});

ipcMain.handle('getActivePuertas', async () => {
  try {
    return await db.getActivePuertas();
  } catch (error) {
    console.error('Error getting active puertas:', error);
    throw error;
  }
});

ipcMain.handle('createPuerta', async (event, data) => {
  try {
    return await db.createPuerta(data);
  } catch (error) {
    console.error('Error creating puerta:', error);
    throw error;
  }
});

ipcMain.handle('updatePuerta', async (event, data) => {
  try {
    return await db.updatePuerta(data);
  } catch (error) {
    console.error('Error updating puerta:', error);
    throw error;
  }
});

ipcMain.handle('togglePuertaStatus', async (event, id, active) => {
  try {
    return await db.togglePuertaStatus(id, active);
  } catch (error) {
    console.error('Error toggling puerta status:', error);
    throw error;
  }
});

ipcMain.handle('deletePuerta', async (event, id) => {
  try {
    return await db.deletePuerta(id);
  } catch (error) {
    console.error('Error deleting puerta:', error);
    throw error;
  }
});

// ============================================
// CONFIGURACIÓN DEL RELAY X-410
// ============================================

ipcMain.handle('getConfigRelay', async () => {
  try {
    return await db.getConfigRelay();
  } catch (error) {
    console.error('Error getting relay config:', error);
    throw error;
  }
});

ipcMain.handle('updateConfigRelay', async (event, data) => {
  try {
    return await db.updateConfigRelay(data);
  } catch (error) {
    console.error('Error updating relay config:', error);
    throw error;
  }
});

app.on('before-quit', () => {
  if (db) {
    db.close();
  }
});