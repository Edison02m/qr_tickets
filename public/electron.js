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

// IPC handlers for ticket system
ipcMain.handle('get-ticket-types', () => {
  return new Promise((resolve, reject) => {
    db.db.all('SELECT * FROM tipos_ticket WHERE activo = 1', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('create-sale', (event, saleData) => {
  return new Promise((resolve, reject) => {
    const { total, tickets } = saleData;
    
    db.db.serialize(() => {
      db.db.run(
        'INSERT INTO ventas (usuario_id, total) VALUES (?, ?)',
        [currentUser.id, total],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          const ventaId = this.lastID;
          const stmt = db.db.prepare(
            'INSERT INTO tickets (venta_id, tipo_ticket_id, codigo_qr, precio) VALUES (?, ?, ?, ?)'
          );
          
          tickets.forEach(ticket => {
            stmt.run(ventaId, ticket.tipo_ticket_id, ticket.codigo_qr, ticket.precio);
          });
          
          stmt.finalize();
          resolve({ success: true, ventaId });
        }
      );
    });
  });
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

app.on('before-quit', () => {
  if (db) {
    db.close();
  }
});