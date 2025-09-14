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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../build/icon.png'),
    titleBarStyle: 'default',
    show: false,
    webSecurity: false
  });

  // Always load from development server for now
  // In production, this would check if build exists
  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
  
  mainWindow.loadURL(startUrl);
  if (startUrl.includes('localhost')) {
    mainWindow.webContents.openDevTools();
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

ipcMain.handle('createSale', async (event, ticketTypeId, amount) => {
  console.log('Recibida solicitud de venta:', { ticketTypeId, amount });
  
  try {
    if (!currentUser) {
      throw new Error('No hay usuario autenticado');
    }
    
    if (typeof ticketTypeId !== 'number' || typeof amount !== 'number') {
      console.error('Tipos de datos incorrectos:', { ticketTypeId, amount });
      throw new Error('Datos de venta inválidos');
    }

    if (!ticketTypeId || !amount) {
      throw new Error('Datos de venta incompletos');
    }

    console.log('Creando venta:', {
      userId: currentUser.id,
      ticketTypeId,
      amount
    });

    const result = await db.createSale(
      parseInt(currentUser.id, 10),
      ticketTypeId,
      amount
    );

    console.log('Venta creada exitosamente:', result);
    return result;

  } catch (error) {
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