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

class Database {
  // Actualizar cierre de caja existente
  updateCashClosure({ usuario_id, fecha_inicio, total_ventas, cantidad_tickets, detalle_tipos }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE cierres_caja SET total_ventas = ?, cantidad_tickets = ?, detalle_tipos = ?, fecha_cierre = CURRENT_TIMESTAMP
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
            `UPDATE cierres_caja SET total_ventas = ?, cantidad_tickets = ?, detalle_tipos = ?, fecha_cierre = CURRENT_TIMESTAMP
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
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de puertas/ubicaciones
      this.db.run(`
        CREATE TABLE IF NOT EXISTS puertas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre VARCHAR(100) NOT NULL UNIQUE,
          codigo VARCHAR(20) NOT NULL UNIQUE,
          descripcion TEXT,
          activo BOOLEAN DEFAULT 1,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (puerta_id) REFERENCES puertas(id)
        )
      `);

      // Tabla de ventas
      this.db.run(`
        CREATE TABLE IF NOT EXISTS ventas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_id INTEGER NOT NULL,
          total DECIMAL(10,2) NOT NULL,
          fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
          fecha_cierre TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          total_ventas DECIMAL(10,2) NOT NULL,
          cantidad_tickets INTEGER NOT NULL,
          detalle_tipos TEXT,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
      `);

      // Insertar usuarios por defecto
      this.insertDefaultUsers();
      this.insertDefaultPuertas();
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
            fecha: new Date().toISOString()
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
        [userId, today.toISOString()],
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
      const fechaConsulta = fecha || new Date().toISOString().split('T')[0];
      
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
              fecha_creacion: new Date().toISOString()
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
      const { nombre, codigo, descripcion } = data;
      
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
      
      this.db.run(
        'INSERT INTO puertas (nombre, codigo, descripcion) VALUES (?, ?, ?)',
        [nombre.trim(), codigo.trim().toUpperCase(), descripcion || null],
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
              activo: 1,
              fecha_creacion: new Date().toISOString()
            });
          }
        }
      );
    });
  }

  // Actualizar una puerta
  updatePuerta(data) {
    return new Promise((resolve, reject) => {
      const { id, nombre, codigo, descripcion } = data;
      
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
      
      this.db.run(
        'UPDATE puertas SET nombre = ?, codigo = ?, descripcion = ? WHERE id = ?',
        [nombre.trim(), codigo.trim().toUpperCase(), descripcion || null, id],
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
            resolve({ id, nombre: nombre.trim(), codigo: codigo.trim().toUpperCase(), descripcion });
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

  close() {
    this.db.close();
  }
}

module.exports = Database;