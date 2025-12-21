const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Función para obtener la ruta de la base de datos
function getDatabasePath() {
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    // En desarrollo, usar la ruta relativa
    return path.join(__dirname, '../../database.sqlite');
  } else {
    // En producción, intentar diferentes ubicaciones
    const possiblePaths = [
      // Ruta en recursos de la aplicación
      path.join(process.resourcesPath, 'database.sqlite'),
      // Ruta en app.asar.unpacked
      path.join(process.resourcesPath, 'app.asar.unpacked', 'database.sqlite'),
      // Ruta en el directorio de la aplicación
      path.join(process.resourcesPath, '..', 'database.sqlite'),
      // Carpeta de datos del usuario
      path.join(require('os').homedir(), 'AppData', 'Roaming', 'electronic-project', 'database.sqlite')
    ];
    
    // Buscar el archivo en las diferentes ubicaciones
    for (const dbPath of possiblePaths) {
      if (fs.existsSync(dbPath)) {
        console.log(`Database found at: ${dbPath}`);
        return dbPath;
      }
    }
    
    // Si no se encuentra, crear en la carpeta de datos del usuario
    const userDataPath = path.join(require('os').homedir(), 'AppData', 'Roaming', 'electronic-project');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    const userDbPath = path.join(userDataPath, 'database.sqlite');
    console.log(`Creating new database at: ${userDbPath}`);
    return userDbPath;
  }
}

const dbPath = getDatabasePath();

// Función helper para obtener fecha/hora local en formato SQLite
function getLocalDateTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000; // offset en milisegundos
  const localDate = new Date(now.getTime() - offset);
  return localDate.toISOString().slice(0, 19).replace('T', ' ');
}

// Función helper para obtener solo la fecha local en formato YYYY-MM-DD
function getLocalDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().split('T')[0];
}

class Database {
  // Actualizar cierre de caja existente
  updateCashClosure({ usuario_id, fecha_inicio, total_ventas, cantidad_tickets, detalle_tipos }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE cierres_caja SET total_ventas = ?, cantidad_tickets = ?, detalle_tipos = ?, fecha_cierre = datetime('now', 'localtime')
         WHERE usuario_id = ? AND date(fecha_inicio) = date(?)`,
        [total_ventas, cantidad_tickets, detalle_tipos, usuario_id, fecha_inicio],
        function(err) {
          if (err) reject(err);
          else resolve({ updated: this.changes });
        }
      );
    });
  }
  // Obtener todos los cierres de caja
  getAllCashClosures() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT cc.*, u.nombre as usuario_nombre, u.usuario as usuario_usuario
         FROM cierres_caja cc
         JOIN usuarios u ON cc.usuario_id = u.id
         ORDER BY cc.fecha_cierre DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Obtener cierre de caja por fecha y usuario
  getCashClosureByDateAndUser(usuario_id, fecha_inicio) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT cc.*, u.nombre as usuario_nombre, u.usuario as usuario_usuario
         FROM cierres_caja cc
         JOIN usuarios u ON cc.usuario_id = u.id
         WHERE cc.usuario_id = ? AND date(cc.fecha_inicio) = date(?)`,
        [usuario_id, fecha_inicio],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        }
      );
    });
  }

  // Crear o actualizar cierre de caja (upsert)
  upsertCashClosure({ usuario_id, fecha_inicio, total_ventas, cantidad_tickets, detalle_tipos }) {
    return new Promise(async (resolve, reject) => {
      try {
        // Verificar si ya existe un cierre para esta fecha y usuario
        const existingClosure = await this.getCashClosureByDateAndUser(usuario_id, fecha_inicio);
        
        if (existingClosure) {
          // Actualizar el cierre existente
          this.db.run(
            `UPDATE cierres_caja SET total_ventas = ?, cantidad_tickets = ?, detalle_tipos = ?, fecha_cierre = datetime('now', 'localtime')
             WHERE usuario_id = ? AND date(fecha_inicio) = date(?)`,
            [total_ventas, cantidad_tickets, detalle_tipos, usuario_id, fecha_inicio],
            function(err) {
              if (err) reject(err);
              else resolve({ 
                action: 'updated', 
                id: existingClosure.id, 
                changes: this.changes 
              });
            }
          );
        } else {
          // Crear un nuevo cierre
          this.db.run(
            `INSERT INTO cierres_caja (usuario_id, fecha_inicio, total_ventas, cantidad_tickets, detalle_tipos)
             VALUES (?, ?, ?, ?, ?)`,
            [usuario_id, fecha_inicio, total_ventas, cantidad_tickets, detalle_tipos],
            function(err) {
              if (err) reject(err);
              else resolve({ 
                action: 'created', 
                id: this.lastID 
              });
            }
          );
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  // Crear un nuevo cierre de caja (mantenido para compatibilidad)
  createCashClosure({ usuario_id, fecha_inicio, total_ventas, cantidad_tickets, detalle_tipos }) {
    return new Promise((resolve, reject) => {
      this.db.runf(
        `INSERT INTO cierres_caja (usuario_id, fecha_inicio, total_ventas, cantidad_tickets, detalle_tipos)
         VALUES (?, ?, ?, ?, ?)`,
        [usuario_id, fecha_inicio, total_ventas, cantidad_tickets, detalle_tipos],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  }
  // Obtener todos los tickets vendidos (para admin, sin filtrar por fecha)
  getAllDailySales() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT v.id as venta_id, v.fecha_venta, v.total, v.anulada,
                u.nombre as vendedor, u.usuario as vendedor_usuario,
                t.id as ticket_id, t.codigo_qr, t.precio as ticket_precio, tt.nombre as tipo_ticket,
                t.anulado, t.usado, t.fecha_uso, t.puerta_codigo
         FROM tickets t
         JOIN ventas v ON t.venta_id = v.id
         JOIN usuarios u ON v.usuario_id = u.id
         JOIN tipos_ticket tt ON t.tipo_ticket_id = tt.id
         ORDER BY v.fecha_venta DESC, v.id DESC, t.id DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Anular una venta (cambia el estado anulada y los tickets asociados)
  annulSale(ventaId) {
    return new Promise((resolve, reject) => {
      // Marcar la venta como anulada y los tickets como anulados
      this.db.run(
        'UPDATE ventas SET anulada = 1 WHERE id = ?',
        [ventaId],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          this.db.run(
            'UPDATE tickets SET anulado = 1 WHERE venta_id = ?',
            [ventaId],
            (err2) => {
              if (err2) reject(err2);
              else resolve({ ventaId, anulada: true });
            }
          );
        }
      );
    });
  }
  constructor() {
    this.db = new sqlite3.Database(dbPath);
    this.initialize();
  }

    // Obtener todos los usuarios
    getUsers() {
      return new Promise((resolve, reject) => {
        this.db.all(
          'SELECT id, nombre, usuario, rol, activo, fecha_creacion FROM usuarios ORDER BY id DESC',
          [],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
    }

    // Crear un nuevo usuario
    createUser(data) {
      return new Promise((resolve, reject) => {
        const bcrypt = require('bcryptjs');
        const { nombre, usuario, password, rol } = data;
        const hashedPassword = bcrypt.hashSync(password, 10);
        this.db.run(
          'INSERT INTO usuarios (nombre, usuario, password, rol) VALUES (?, ?, ?, ?)',
          [nombre, usuario, hashedPassword, rol],
          function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, nombre, usuario, rol, activo: 1 });
          }
        );
      });
    }

    // Actualizar datos de usuario (nombre, usuario, rol)
    updateUser(data) {
      return new Promise((resolve, reject) => {
        const { id, nombre, usuario, rol } = data;
        this.db.run(
          'UPDATE usuarios SET nombre = ?, usuario = ?, rol = ? WHERE id = ?',
          [nombre, usuario, rol, id],
          (err) => {
            if (err) reject(err);
            else resolve({ id, nombre, usuario, rol });
          }
        );
      });
    }

    // Cambiar contraseña de usuario
    changeUserPassword(id, newPassword) {
      return new Promise((resolve, reject) => {
        const bcrypt = require('bcryptjs');
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        this.db.run(
          'UPDATE usuarios SET password = ? WHERE id = ?',
          [hashedPassword, id],
          (err) => {
            if (err) reject(err);
            else resolve({ id });
          }
        );
      });
    }

    // Activar/desactivar usuario
    toggleUserStatus(id, active) {
      return new Promise((resolve, reject) => {
        this.db.run(
          'UPDATE usuarios SET activo = ? WHERE id = ?',
          [active ? 1 : 0, id],
          (err) => {
            if (err) reject(err);
            else resolve({ id, activo: active });
          }
        );
      });
    }

    // Eliminar usuario (solo si no tiene ventas asociadas)
    deleteUser(id) {
      return new Promise((resolve, reject) => {
        this.db.get(
          'SELECT COUNT(*) as count FROM ventas WHERE usuario_id = ?',
          [id],
          (err, row) => {
            if (err) {
              reject(err);
              return;
            }
            if (row.count > 0) {
              // Si tiene ventas, solo desactivar
              this.db.run(
                'UPDATE usuarios SET activo = 0 WHERE id = ?',
                [id],
                (err) => {
                  if (err) reject(err);
                  else resolve({ id, eliminado: false, desactivado: true });
                }
              );
            } else {
              // Si no tiene ventas, eliminar
              this.db.run(
                'DELETE FROM usuarios WHERE id = ?',
                [id],
                (err) => {
                  if (err) reject(err);
                  else resolve({ id, eliminado: true });
                }
              );
            }
          }
        );
      });
    }

  initialize() {
    this.db.serialize(() => {
      // Tabla de usuarios
      this.db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre VARCHAR(100) NOT NULL,
          usuario VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          rol VARCHAR(20) NOT NULL CHECK(rol IN ('vendedor', 'admin')),
          activo BOOLEAN DEFAULT 1,
          fecha_creacion TIMESTAMP DEFAULT (datetime('now', 'localtime'))
        )
      `);

      // Tabla de puertas/ubicaciones
      this.db.run(`
        CREATE TABLE IF NOT EXISTS puertas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre VARCHAR(100) NOT NULL UNIQUE,
          codigo VARCHAR(20) NOT NULL UNIQUE,
          descripcion TEXT,
          lector_ip VARCHAR(15),
          lector_port INTEGER DEFAULT 5000,
          relay_number INTEGER CHECK(relay_number BETWEEN 1 AND 3),
          tiempo_apertura_segundos INTEGER DEFAULT 5 CHECK(tiempo_apertura_segundos BETWEEN 1 AND 60),
          activo BOOLEAN DEFAULT 1,
          fecha_creacion TIMESTAMP DEFAULT (datetime('now', 'localtime'))
        )
      `);

      // Tabla de tipos de tickets
      this.db.run(`
        CREATE TABLE IF NOT EXISTS tipos_ticket (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre VARCHAR(50) NOT NULL UNIQUE,
          precio DECIMAL(10,2) NOT NULL CHECK(precio > 0),
          puerta_id INTEGER,
          activo BOOLEAN DEFAULT 1,
          fecha_creacion TIMESTAMP DEFAULT (datetime('now', 'localtime')),
          FOREIGN KEY (puerta_id) REFERENCES puertas(id)
        )
      `);

      // Tabla de ventas
      this.db.run(`
        CREATE TABLE IF NOT EXISTS ventas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_id INTEGER NOT NULL,
          total DECIMAL(10,2) NOT NULL,
          fecha_venta TIMESTAMP DEFAULT (datetime('now', 'localtime')),
          anulada BOOLEAN DEFAULT 0,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
      `);

      // Tabla de tickets vendidos
      this.db.run(`
        CREATE TABLE IF NOT EXISTS tickets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          venta_id INTEGER NOT NULL,
          tipo_ticket_id INTEGER NOT NULL,
          codigo_qr VARCHAR(150) UNIQUE NOT NULL,
          puerta_codigo VARCHAR(20),
          precio DECIMAL(10,2) NOT NULL,
          fecha_creacion TIMESTAMP DEFAULT (datetime('now', 'localtime')),
          anulado BOOLEAN DEFAULT 0,
          usado BOOLEAN DEFAULT 0,
          fecha_uso TIMESTAMP,
          FOREIGN KEY (venta_id) REFERENCES ventas(id),
          FOREIGN KEY (tipo_ticket_id) REFERENCES tipos_ticket(id)
        )
      `);

      // Tabla de cierres de caja
      this.db.run(`
        CREATE TABLE IF NOT EXISTS cierres_caja (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_id INTEGER NOT NULL,
          fecha_inicio TIMESTAMP NOT NULL,
          fecha_cierre TIMESTAMP DEFAULT (datetime('now', 'localtime')),
          total_ventas DECIMAL(10,2) NOT NULL,
          cantidad_tickets INTEGER NOT NULL,
          detalle_tipos TEXT,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
      `);

      // Tabla de configuración del relay X-410
      this.db.run(`
        CREATE TABLE IF NOT EXISTS config_relay (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          ip VARCHAR(15) NOT NULL DEFAULT '192.168.3.200',
          port INTEGER NOT NULL DEFAULT 80,
          timeout INTEGER NOT NULL DEFAULT 3000,
          reintentos INTEGER NOT NULL DEFAULT 3,
          fecha_actualizacion TIMESTAMP DEFAULT (datetime('now', 'localtime'))
        )
      `);

      // Insertar usuarios por defecto
      this.insertDefaultUsers();
      this.insertDefaultPuertas();
      this.insertDefaultRelayConfig();
      
      // Ejecutar migraciones
      this.runMigrations();
    });
  }

  runMigrations() {
    // Migración: Agregar columnas de configuración de relay a puertas existentes
    this.db.all("PRAGMA table_info(puertas)", [], (err, columns) => {
      if (err) {
        console.error('Error checking puertas table schema:', err);
        return;
      }
      
      const columnNames = columns.map(col => col.name);
      
      // Agregar lector_ip si no existe
      if (!columnNames.includes('lector_ip')) {
        this.db.run("ALTER TABLE puertas ADD COLUMN lector_ip VARCHAR(15)", (err) => {
          if (err) console.error('Error adding lector_ip column:', err);
          else console.log('✓ Columna lector_ip agregada a puertas');
        });
      }
      
      // Agregar lector_port si no existe
      if (!columnNames.includes('lector_port')) {
        this.db.run("ALTER TABLE puertas ADD COLUMN lector_port INTEGER DEFAULT 5000", (err) => {
          if (err) console.error('Error adding lector_port column:', err);
          else console.log('✓ Columna lector_port agregada a puertas');
        });
      }
      
      // Agregar relay_number si no existe
      if (!columnNames.includes('relay_number')) {
        this.db.run("ALTER TABLE puertas ADD COLUMN relay_number INTEGER CHECK(relay_number BETWEEN 1 AND 3)", (err) => {
          if (err) console.error('Error adding relay_number column:', err);
          else console.log('✓ Columna relay_number agregada a puertas');
        });
      }
      
      // Agregar tiempo_apertura_segundos si no existe
      if (!columnNames.includes('tiempo_apertura_segundos')) {
        this.db.run("ALTER TABLE puertas ADD COLUMN tiempo_apertura_segundos INTEGER DEFAULT 5 CHECK(tiempo_apertura_segundos BETWEEN 1 AND 60)", (err) => {
          if (err) console.error('Error adding tiempo_apertura_segundos column:', err);
          else console.log('✓ Columna tiempo_apertura_segundos agregada a puertas');
        });
      }
    });
  }

  insertDefaultUsers() {
    const bcrypt = require('bcryptjs');
    const hashedAdminPassword = bcrypt.hashSync('admin123', 10);
    const hashedVendedorPassword = bcrypt.hashSync('vendedor123', 10);
    
    // Insertar administrador
    this.db.run(`
      INSERT OR IGNORE INTO usuarios (nombre, usuario, password, rol)
      VALUES ('Administrador', 'admin', ?, 'admin')
    `, [hashedAdminPassword]);
    
    // Insertar vendedor
    this.db.run(`
      INSERT OR IGNORE INTO usuarios (nombre, usuario, password, rol)
      VALUES ('Vendedor Demo', 'vendedor', ?, 'vendedor')
    `, [hashedVendedorPassword]);
  }

  insertDefaultPuertas() {
    // Insertar puertas por defecto
    const puertasDefault = [
      { nombre: 'Puerta Principal', codigo: 'A', descripcion: 'Entrada principal del evento' },
      { nombre: 'Puerta VIP', codigo: 'VIP', descripcion: 'Acceso exclusivo VIP' },
      { nombre: 'Puerta Norte', codigo: 'N', descripcion: 'Entrada norte' },
      { nombre: 'Puerta Sur', codigo: 'S', descripcion: 'Entrada sur' }
    ];

    puertasDefault.forEach(puerta => {
      this.db.run(`
        INSERT OR IGNORE INTO puertas (nombre, codigo, descripcion)
        SELECT ?, ?, ?
        WHERE NOT EXISTS (SELECT 1 FROM puertas WHERE codigo = ?)
      `, [puerta.nombre, puerta.codigo, puerta.descripcion, puerta.codigo]);
    });
  }

  insertDefaultRelayConfig() {
    // Insertar configuración por defecto del relay X-410
    this.db.run(`
      INSERT OR IGNORE INTO config_relay (id, ip, port, timeout, reintentos)
      VALUES (1, '192.168.3.200', 80, 3000, 3)
    `);
  }


  getUserByUsername(usuario) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM usuarios WHERE usuario = ? AND activo = 1',
        [usuario],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // Obtener todos los tipos de tickets
  getTicketTypes() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT tt.*, p.nombre as puerta_nombre, p.codigo as puerta_codigo 
         FROM tipos_ticket tt
         LEFT JOIN puertas p ON tt.puerta_id = p.id
         ORDER BY tt.id DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Obtener solo los tipos de tickets activos
  getActiveTicketTypes() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT tt.*, p.nombre as puerta_nombre, p.codigo as puerta_codigo 
         FROM tipos_ticket tt
         LEFT JOIN puertas p ON tt.puerta_id = p.id
         WHERE tt.activo = 1 
         ORDER BY tt.id DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Registrar una nueva venta, ahora acepta qrCode generado en el frontend
  createSale(userId, ticketTypeId, totalAmount, qrCode, puertaCodigo) {
    return new Promise((resolve, reject) => {
      let ventaId;

      const runQuery = (query, params) => {
        return new Promise((resolve, reject) => {
          this.db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve(this);
          });
        });
      };

      // Ejecutar la transacción completa
      this.db.serialize(async () => {
        try {
          // Iniciar transacción
          await runQuery('BEGIN TRANSACTION', []);

          // Insertar la venta
          const ventaResult = await runQuery(
            'INSERT INTO ventas (usuario_id, total) VALUES (?, ?)',
            [userId, totalAmount]
          );
          ventaId = ventaResult.lastID;

          // Insertar el ticket con el código QR y puerta_codigo
          await runQuery(
            'INSERT INTO tickets (venta_id, tipo_ticket_id, codigo_qr, puerta_codigo, precio) VALUES (?, ?, ?, ?, ?)',
            [ventaId, ticketTypeId, qrCode, puertaCodigo || null, totalAmount]
          );

          // Confirmar transacción
          await runQuery('COMMIT', []);

          // Retornar resultado
          resolve({
            ventaId,
            qrCode,
            ticketTypeId,
            precio: totalAmount,
            puertaCodigo,
            fecha: getLocalDateTime()
          });
        } catch (error) {
          await runQuery('ROLLBACK', [])
            .catch(rollbackError => console.error('Error en rollback:', rollbackError));
          reject(error);
        }
      });
    });
  }
  
  // Generar un código QR único
  generateUniqueQRCode() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `TICKET-${timestamp}-${random}`;
  }

  // Obtener las ventas del día para un usuario
  getDailySales(userId) {
    return new Promise((resolve, reject) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      this.db.all(
        `SELECT v.*, t.codigo_qr, t.precio as ticket_precio, tt.nombre as tipo_ticket
         FROM ventas v
         JOIN tickets t ON v.id = t.venta_id
         JOIN tipos_ticket tt ON t.tipo_ticket_id = tt.id
         WHERE v.usuario_id = ? 
         AND date(v.fecha_venta) = date(?)
         AND v.anulada = 0
         ORDER BY v.fecha_venta DESC`,
        [userId, getLocalDate(today)],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Obtener resumen de ventas diarias de un vendedor específico
  getVendedorDailySummary(userId, fecha = null) {
    return new Promise((resolve, reject) => {
      // Si no se proporciona fecha, usar la fecha actual
      const fechaConsulta = fecha || getLocalDate();
      
      this.db.all(
        `SELECT 
           tt.nombre as tipo_ticket,
           COUNT(t.id) as cantidad_tickets,
           SUM(t.precio) as total_tipo,
           v.fecha_venta
         FROM tickets t
         JOIN ventas v ON t.venta_id = v.id
         JOIN tipos_ticket tt ON t.tipo_ticket_id = tt.id
         WHERE v.usuario_id = ? 
           AND date(v.fecha_venta) = date(?)
           AND v.anulada = 0
         GROUP BY tt.id, tt.nombre
         ORDER BY tt.nombre`,
        [userId, fechaConsulta],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            // Calcular totales
            const totalTickets = rows.reduce((sum, row) => sum + row.cantidad_tickets, 0);
            const totalVentas = rows.reduce((sum, row) => sum + row.total_tipo, 0);
            
            resolve({
              fecha: fechaConsulta,
              total_tickets: totalTickets,
              total_ventas: totalVentas,
              detalle_por_tipo: rows
            });
          }
        }
      );
    });
  }

  // Crear un nuevo tipo de ticket
  createTicketType(data) {
    return new Promise((resolve, reject) => {
      const { nombre, precio, puerta_id } = data;
      
      // Validaciones
      if (!nombre || nombre.trim() === '') {
        reject(new Error('El nombre del tipo de ticket es requerido'));
        return;
      }
      if (!precio || precio <= 0) {
        reject(new Error('El precio debe ser mayor a 0'));
        return;
      }
      
      this.db.run(
        'INSERT INTO tipos_ticket (nombre, precio, puerta_id) VALUES (?, ?, ?)',
        [nombre.trim(), precio, puerta_id || null],
        function(err) {
          if (err) {
            if (err.message && err.message.includes('UNIQUE')) {
              reject(new Error('Ya existe un tipo de ticket con ese nombre'));
            } else {
              reject(err);
            }
          } else {
            resolve({
              id: this.lastID,
              nombre: nombre.trim(),
              precio,
              puerta_id,
              activo: 1,
              fecha_creacion: getLocalDateTime()
            });
          }
        }
      );
    });
  }

  // Actualizar un tipo de ticket existente
  updateTicketType(data) {
    return new Promise((resolve, reject) => {
      const { id, nombre, precio, puerta_id } = data;
      
      // Validaciones
      if (!nombre || nombre.trim() === '') {
        reject(new Error('El nombre del tipo de ticket es requerido'));
        return;
      }
      if (!precio || precio <= 0) {
        reject(new Error('El precio debe ser mayor a 0'));
        return;
      }
      
      this.db.run(
        'UPDATE tipos_ticket SET nombre = ?, precio = ?, puerta_id = ? WHERE id = ?',
        [nombre.trim(), precio, puerta_id || null, id],
        (err) => {
          if (err) {
            if (err.message && err.message.includes('UNIQUE')) {
              reject(new Error('Ya existe un tipo de ticket con ese nombre'));
            } else {
              reject(err);
            }
          } else {
            resolve({ id, nombre: nombre.trim(), precio, puerta_id });
          }
        }
      );
    });
  }

  // Cambiar el estado activo/inactivo de un tipo de ticket
  toggleTicketTypeStatus(id, active) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE tipos_ticket SET activo = ? WHERE id = ?',
        [active ? 1 : 0, id],
        (err) => {
          if (err) reject(err);
          else resolve({ id, activo: active });
        }
      );
    });
  }

  // Eliminar un tipo de ticket
  deleteTicketType(id) {
    return new Promise((resolve, reject) => {
      // Primero verificamos si hay tickets vendidos con este tipo
      this.db.get(
        'SELECT COUNT(*) as count FROM tickets WHERE tipo_ticket_id = ?',
        [id],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row.count > 0) {
            // Si hay tickets vendidos, solo marcamos como inactivo
            this.db.run(
              'UPDATE tipos_ticket SET activo = 0 WHERE id = ?',
              [id],
              (err) => {
                if (err) reject(err);
                else resolve({ success: true, wasDeactivated: true });
              }
            );
          } else {
            // Si no hay tickets vendidos, eliminamos el registro
            this.db.run(
              'DELETE FROM tipos_ticket WHERE id = ?',
              [id],
              (err) => {
                if (err) reject(err);
                else resolve({ success: true, wasDeactivated: false });
              }
            );
          }
        }
      );
    });
  }

  // ============================================
  // MÉTODOS PARA PUERTAS/UBICACIONES
  // ============================================

  // Obtener todas las puertas
  getPuertas() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM puertas ORDER BY id DESC',
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Obtener solo puertas activas
  getActivePuertas() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM puertas WHERE activo = 1 ORDER BY nombre ASC',
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Crear una nueva puerta
  createPuerta(data) {
    return new Promise((resolve, reject) => {
      const { nombre, codigo, descripcion, lector_ip, lector_port, relay_number, tiempo_apertura_segundos } = data;
      
      // Validaciones
      if (!nombre || nombre.trim() === '') {
        reject(new Error('El nombre de la puerta es requerido'));
        return;
      }
      if (!codigo || codigo.trim() === '') {
        reject(new Error('El código de la puerta es requerido'));
        return;
      }
      // Validar que el código solo contenga letras y números
      if (!/^[A-Za-z0-9]+$/.test(codigo.trim())) {
        reject(new Error('El código solo puede contener letras y números'));
        return;
      }
      
      // Validar IP del lector si se proporciona
      if (lector_ip && !/^(\d{1,3}\.){3}\d{1,3}$/.test(lector_ip.trim())) {
        reject(new Error('Formato de IP del lector inválido'));
        return;
      }
      
      // Validar número de relay si se proporciona
      if (relay_number && (relay_number < 1 || relay_number > 3)) {
        reject(new Error('El número de relay debe ser 1, 2 o 3'));
        return;
      }
      
      // Validar tiempo de apertura si se proporciona
      if (tiempo_apertura_segundos && (tiempo_apertura_segundos < 1 || tiempo_apertura_segundos > 60)) {
        reject(new Error('El tiempo de apertura debe estar entre 1 y 60 segundos'));
        return;
      }
      
      this.db.run(
        `INSERT INTO puertas (nombre, codigo, descripcion, lector_ip, lector_port, relay_number, tiempo_apertura_segundos) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          nombre.trim(), 
          codigo.trim().toUpperCase(), 
          descripcion || null,
          lector_ip ? lector_ip.trim() : null,
          lector_port || 5000,
          relay_number || null,
          tiempo_apertura_segundos || 5
        ],
        function(err) {
          if (err) {
            if (err.message && err.message.includes('UNIQUE')) {
              if (err.message.includes('codigo')) {
                reject(new Error('Ya existe una puerta con ese código'));
              } else {
                reject(new Error('Ya existe una puerta con ese nombre'));
              }
            } else {
              reject(err);
            }
          } else {
            resolve({
              id: this.lastID,
              nombre: nombre.trim(),
              codigo: codigo.trim().toUpperCase(),
              descripcion,
              lector_ip: lector_ip ? lector_ip.trim() : null,
              lector_port: lector_port || 5000,
              relay_number: relay_number || null,
              tiempo_apertura_segundos: tiempo_apertura_segundos || 5,
              activo: 1,
              fecha_creacion: getLocalDateTime()
            });
          }
        }
      );
    });
  }

  // Actualizar una puerta
  updatePuerta(data) {
    return new Promise((resolve, reject) => {
      const { id, nombre, codigo, descripcion, lector_ip, lector_port, relay_number, tiempo_apertura_segundos } = data;
      
      // Validaciones
      if (!nombre || nombre.trim() === '') {
        reject(new Error('El nombre de la puerta es requerido'));
        return;
      }
      if (!codigo || codigo.trim() === '') {
        reject(new Error('El código de la puerta es requerido'));
        return;
      }
      // Validar que el código solo contenga letras y números
      if (!/^[A-Za-z0-9]+$/.test(codigo.trim())) {
        reject(new Error('El código solo puede contener letras y números'));
        return;
      }
      
      // Validar IP del lector si se proporciona
      if (lector_ip && lector_ip.trim() !== '' && !/^(\d{1,3}\.){3}\d{1,3}$/.test(lector_ip.trim())) {
        reject(new Error('Formato de IP del lector inválido'));
        return;
      }
      
      // Validar número de relay si se proporciona
      if (relay_number && (relay_number < 1 || relay_number > 3)) {
        reject(new Error('El número de relay debe ser 1, 2 o 3'));
        return;
      }
      
      // Validar tiempo de apertura si se proporciona
      if (tiempo_apertura_segundos && (tiempo_apertura_segundos < 1 || tiempo_apertura_segundos > 60)) {
        reject(new Error('El tiempo de apertura debe estar entre 1 y 60 segundos'));
        return;
      }
      
      this.db.run(
        `UPDATE puertas SET 
          nombre = ?, 
          codigo = ?, 
          descripcion = ?,
          lector_ip = ?,
          lector_port = ?,
          relay_number = ?,
          tiempo_apertura_segundos = ?
         WHERE id = ?`,
        [
          nombre.trim(), 
          codigo.trim().toUpperCase(), 
          descripcion || null,
          lector_ip ? lector_ip.trim() : null,
          lector_port || 5000,
          relay_number || null,
          tiempo_apertura_segundos || 5,
          id
        ],
        (err) => {
          if (err) {
            if (err.message && err.message.includes('UNIQUE')) {
              if (err.message.includes('codigo')) {
                reject(new Error('Ya existe una puerta con ese código'));
              } else {
                reject(new Error('Ya existe una puerta con ese nombre'));
              }
            } else {
              reject(err);
            }
          } else {
            resolve({ 
              id, 
              nombre: nombre.trim(), 
              codigo: codigo.trim().toUpperCase(), 
              descripcion,
              lector_ip: lector_ip ? lector_ip.trim() : null,
              lector_port: lector_port || 5000,
              relay_number: relay_number || null,
              tiempo_apertura_segundos: tiempo_apertura_segundos || 5
            });
          }
        }
      );
    });
  }

  // Cambiar estado activo/inactivo de una puerta
  togglePuertaStatus(id, active) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE puertas SET activo = ? WHERE id = ?',
        [active ? 1 : 0, id],
        (err) => {
          if (err) reject(err);
          else resolve({ id, activo: active });
        }
      );
    });
  }

  // Eliminar una puerta
  deletePuerta(id) {
    return new Promise((resolve, reject) => {
      // Verificar si hay tipos de ticket usando esta puerta
      this.db.get(
        'SELECT COUNT(*) as count FROM tipos_ticket WHERE puerta_id = ?',
        [id],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row.count > 0) {
            // Si hay tipos de ticket, solo desactivar
            this.db.run(
              'UPDATE puertas SET activo = 0 WHERE id = ?',
              [id],
              (err) => {
                if (err) reject(err);
                else resolve({ success: true, wasDeactivated: true });
              }
            );
          } else {
            // Si no hay tipos de ticket, eliminar
            this.db.run(
              'DELETE FROM puertas WHERE id = ?',
              [id],
              (err) => {
                if (err) reject(err);
                else resolve({ success: true, wasDeactivated: false });
              }
            );
          }
        }
      );
    });
  }

  // ============================================
  // MÉTODOS PARA CONFIGURACIÓN DEL RELAY X-410
  // ============================================

  // Obtener configuración del relay X-410
  getConfigRelay() {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM config_relay WHERE id = 1',
        [],
        (err, row) => {
          if (err) {
            reject(err);
          } else if (row) {
            resolve(row);
          } else {
            // Si no existe, crear configuración por defecto
            this.db.run(
              `INSERT INTO config_relay (id, ip, port, timeout, reintentos) 
               VALUES (1, '192.168.3.200', 80, 3000, 3)`,
              (err) => {
                if (err) {
                  reject(err);
                } else {
                  // Retornar configuración por defecto
                  resolve({
                    id: 1,
                    ip: '192.168.3.200',
                    port: 80,
                    timeout: 3000,
                    reintentos: 3,
                    fecha_actualizacion: getLocalDateTime()
                  });
                }
              }
            );
          }
        }
      );
    });
  }

  // Actualizar configuración del relay X-410
  updateConfigRelay(data) {
    return new Promise((resolve, reject) => {
      const { ip, port, timeout, reintentos } = data;
      
      // Validaciones
      if (!ip || !/^(\d{1,3}\.){3}\d{1,3}$/.test(ip.trim())) {
        reject(new Error('Formato de IP inválido'));
        return;
      }
      
      if (!port || port < 1 || port > 65535) {
        reject(new Error('El puerto debe estar entre 1 y 65535'));
        return;
      }
      
      if (!timeout || timeout < 100 || timeout > 30000) {
        reject(new Error('El timeout debe estar entre 100 y 30000 ms'));
        return;
      }
      
      if (!reintentos || reintentos < 1 || reintentos > 10) {
        reject(new Error('Los reintentos deben estar entre 1 y 10'));
        return;
      }
      
      this.db.run(
        `UPDATE config_relay 
         SET ip = ?, port = ?, timeout = ?, reintentos = ?, fecha_actualizacion = datetime('now', 'localtime')
         WHERE id = 1`,
        [ip.trim(), port, timeout, reintentos],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: 1,
              ip: ip.trim(),
              port,
              timeout,
              reintentos,
              fecha_actualizacion: getLocalDateTime()
            });
          }
        }
      );
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;