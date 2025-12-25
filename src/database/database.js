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
        return dbPath;
      }
    }
    
    // Si no se encuentra, crear en la carpeta de datos del usuario
    const userDataPath = path.join(require('os').homedir(), 'AppData', 'Roaming', 'electronic-project');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    const userDbPath = path.join(userDataPath, 'database.sqlite');
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

  // Obtener todos los cierres de todos los usuarios para una fecha específica (para admin)
  getAllCashClosuresByDate(fecha) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT cc.*, u.nombre as usuario_nombre, u.usuario as usuario_usuario
         FROM cierres_caja cc
         JOIN usuarios u ON cc.usuario_id = u.id
         WHERE date(cc.fecha_inicio) = date(?)
         ORDER BY u.nombre ASC`,
        [fecha],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            // Calcular totales consolidados
            const totalVentas = rows.reduce((sum, row) => sum + parseFloat(row.total_ventas || 0), 0);
            const totalTickets = rows.reduce((sum, row) => sum + parseInt(row.cantidad_tickets || 0), 0);
            
            resolve({
              fecha: fecha,
              cierres: rows,
              totales: {
                total_ventas: totalVentas,
                cantidad_tickets: totalTickets,
                cantidad_usuarios: rows.length
              }
            });
          }
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
                t.anulado, t.usado, t.fecha_uso, t.puerta_codigo, t.impreso, t.fecha_impresion
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
          relay_number INTEGER CHECK(relay_number BETWEEN 1 AND 4),
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
          modo_rele1 VARCHAR(2) DEFAULT 'NA' CHECK(modo_rele1 IN ('NA', 'NC')),
          modo_rele2 VARCHAR(2) DEFAULT 'NA' CHECK(modo_rele2 IN ('NA', 'NC')),
          modo_rele3 VARCHAR(2) DEFAULT 'NA' CHECK(modo_rele3 IN ('NA', 'NC')),
          modo_rele4 VARCHAR(2) DEFAULT 'NA' CHECK(modo_rele4 IN ('NA', 'NC')),
          fecha_actualizacion TIMESTAMP DEFAULT (datetime('now', 'localtime'))
        )
      `);

      // Tabla de configuración de botones físicos para impresión automática
      this.db.run(`
        CREATE TABLE IF NOT EXISTS botones_tickets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          input_numero INTEGER NOT NULL CHECK(input_numero BETWEEN 1 AND 4),
          tipo_ticket_id INTEGER NOT NULL,
          cantidad INTEGER NOT NULL DEFAULT 1 CHECK(cantidad > 0),
          descripcion TEXT,
          activo BOOLEAN DEFAULT 1,
          fecha_creacion TIMESTAMP DEFAULT (datetime('now', 'localtime')),
          fecha_actualizacion TIMESTAMP DEFAULT (datetime('now', 'localtime')),
          FOREIGN KEY (tipo_ticket_id) REFERENCES tipos_ticket(id),
          UNIQUE(input_numero)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating botones_tickets table:', err);
        }
      });

      // Tabla de logs de configuración (historial de cambios del admin)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS config_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          accion VARCHAR(20) NOT NULL CHECK(accion IN ('crear', 'modificar', 'eliminar')),
          tabla_afectada VARCHAR(50) NOT NULL CHECK(tabla_afectada IN ('puertas', 'config_relay', 'tipos_ticket', 'botones_tickets')),
          registro_id INTEGER,
          descripcion TEXT,
          datos_anteriores TEXT,
          datos_nuevos TEXT,
          fecha_hora TIMESTAMP DEFAULT (datetime('now', 'localtime')),
          ip_address VARCHAR(45)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating config_logs table:', err);
        }
      });

  // Insertar usuario admin por defecto
  this.insertDefaultUsers();
      
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
        });
      }
      
      // Agregar lector_port si no existe
      if (!columnNames.includes('lector_port')) {
        this.db.run("ALTER TABLE puertas ADD COLUMN lector_port INTEGER DEFAULT 5000", (err) => {
          if (err) console.error('Error adding lector_port column:', err);
        });
      }
      
      // Agregar relay_number si no existe
      if (!columnNames.includes('relay_number')) {
        this.db.run("ALTER TABLE puertas ADD COLUMN relay_number INTEGER CHECK(relay_number BETWEEN 1 AND 4)", (err) => {
          if (err) console.error('Error adding relay_number column:', err);
        });
      }
      
      // Agregar tiempo_apertura_segundos si no existe
      if (!columnNames.includes('tiempo_apertura_segundos')) {
        this.db.run("ALTER TABLE puertas ADD COLUMN tiempo_apertura_segundos INTEGER DEFAULT 5 CHECK(tiempo_apertura_segundos BETWEEN 1 AND 60)", (err) => {
          if (err) console.error('Error adding tiempo_apertura_segundos column:', err);
        });
      }
      
      // Agregar modo_rele si no existe (NA = Normalmente Abierto, NC = Normalmente Cerrado)
      if (!columnNames.includes('modo_rele')) {
        this.db.run("ALTER TABLE puertas ADD COLUMN modo_rele VARCHAR(2) DEFAULT 'NA' CHECK(modo_rele IN ('NA', 'NC'))", (err) => {
          if (err) console.error('Error adding modo_rele column:', err);
        });
      }
    });
    
    // Migración: Agregar columnas de modo_rele a config_relay
    this.db.all("PRAGMA table_info(config_relay)", [], (err, columns) => {
      if (err) {
        console.error('Error checking config_relay table schema:', err);
        return;
      }
      
      const columnNames = columns.map(col => col.name);
      
      // Agregar modo_rele1 si no existe
      if (!columnNames.includes('modo_rele1')) {
        this.db.run("ALTER TABLE config_relay ADD COLUMN modo_rele1 VARCHAR(2) DEFAULT 'NA' CHECK(modo_rele1 IN ('NA', 'NC'))", (err) => {
          if (err) console.error('Error adding modo_rele1 column:', err);
        });
      }
      
      // Agregar modo_rele2 si no existe
      if (!columnNames.includes('modo_rele2')) {
        this.db.run("ALTER TABLE config_relay ADD COLUMN modo_rele2 VARCHAR(2) DEFAULT 'NA' CHECK(modo_rele2 IN ('NA', 'NC'))", (err) => {
          if (err) console.error('Error adding modo_rele2 column:', err);
        });
      }
      
      // Agregar modo_rele3 si no existe
      if (!columnNames.includes('modo_rele3')) {
        this.db.run("ALTER TABLE config_relay ADD COLUMN modo_rele3 VARCHAR(2) DEFAULT 'NA' CHECK(modo_rele3 IN ('NA', 'NC'))", (err) => {
          if (err) console.error('Error adding modo_rele3 column:', err);
        });
      }
      
      // Agregar modo_rele4 si no existe
      if (!columnNames.includes('modo_rele4')) {
        this.db.run("ALTER TABLE config_relay ADD COLUMN modo_rele4 VARCHAR(2) DEFAULT 'NA' CHECK(modo_rele4 IN ('NA', 'NC'))", (err) => {
          if (err) console.error('Error adding modo_rele4 column:', err);
        });
      }
    });
    
    // Migración: Agregar columnas de impresión a tickets existentes
    this.db.all("PRAGMA table_info(tickets)", [], (err, columns) => {
      if (err) {
        console.error('Error checking tickets table schema:', err);
        return;
      }
      
      const columnNames = columns.map(col => col.name);
      
      // Agregar impreso si no existe
      if (!columnNames.includes('impreso')) {
        this.db.run("ALTER TABLE tickets ADD COLUMN impreso BOOLEAN DEFAULT 0", (err) => {
          if (err) console.error('Error adding impreso column:', err);
        });
      }
      
      // Agregar fecha_impresion si no existe
      if (!columnNames.includes('fecha_impresion')) {
        this.db.run("ALTER TABLE tickets ADD COLUMN fecha_impresion TIMESTAMP", (err) => {
          if (err) console.error('Error adding fecha_impresion column:', err);
        });
      }
    });

    // Migración: Agregar UNIQUE constraint a cierres_caja para (usuario_id, fecha_inicio)
    // SQLite no permite modificar constraints, así que recreamos la tabla
    this.db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='cierres_caja'", [], (err, table) => {
      if (err) {
        console.error('Error checking cierres_caja table:', err);
        return;
      }
      
      if (table) {
        // Verificar si ya existe el índice único
        this.db.get("SELECT name FROM sqlite_master WHERE type='index' AND name='unique_usuario_fecha_cierre'", [], (err, index) => {
          if (err) {
            console.error('Error checking index:', err);
            return;
          }
          
          if (!index) {
            console.log('Migrando tabla cierres_caja para agregar constraint UNIQUE(usuario_id, fecha_inicio)...');
            
            this.db.serialize(() => {
              // Crear tabla temporal con el nuevo constraint
              this.db.run(`
                CREATE TABLE IF NOT EXISTS cierres_caja_new (
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
              
              // Copiar datos existentes (eliminando duplicados si los hay, quedándose con el más reciente)
              this.db.run(`
                INSERT INTO cierres_caja_new (id, usuario_id, fecha_inicio, fecha_cierre, total_ventas, cantidad_tickets, detalle_tipos)
                SELECT id, usuario_id, fecha_inicio, fecha_cierre, total_ventas, cantidad_tickets, detalle_tipos
                FROM cierres_caja
                WHERE id IN (
                  SELECT MAX(id) 
                  FROM cierres_caja 
                  GROUP BY usuario_id, date(fecha_inicio)
                )
              `);
              
              // Eliminar tabla antigua
              this.db.run('DROP TABLE cierres_caja');
              
              // Renombrar nueva tabla
              this.db.run('ALTER TABLE cierres_caja_new RENAME TO cierres_caja', (err) => {
                if (err) {
                  console.error('Error al migrar cierres_caja:', err);
                } else {
                  // Crear índice único en (usuario_id, date(fecha_inicio))
                  this.db.run('CREATE UNIQUE INDEX unique_usuario_fecha_cierre ON cierres_caja(usuario_id, date(fecha_inicio))', (err) => {
                    if (err) {
                      console.error('Error al crear índice único:', err);
                    }
                  });
                }
              });
            });
          }
        });
      }
    });

    // Migración: Verificar estructura de config_logs
    this.db.all("PRAGMA table_info(config_logs)", [], (err, columns) => {
      if (err) {
        console.error('Error checking config_logs table schema:', err);
        return;
      }
      
      if (columns.length === 0) {
        // La tabla no existe, se creará automáticamente arriba
        return;
      }

      const columnNames = columns.map(col => col.name);
      
      // Verificar si tiene la columna fecha_hora
      if (!columnNames.includes('fecha_hora')) {
        console.log('Migrando tabla config_logs: recreando con estructura correcta...');
        
        this.db.serialize(() => {
          // Respaldar datos si existen
          this.db.run('ALTER TABLE config_logs RENAME TO config_logs_old');
          
          // Crear nueva tabla con estructura correcta
          this.db.run(`
            CREATE TABLE config_logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              accion VARCHAR(20) NOT NULL CHECK(accion IN ('crear', 'modificar', 'eliminar')),
              tabla_afectada VARCHAR(50) NOT NULL CHECK(tabla_afectada IN ('puertas', 'config_relay', 'tipos_ticket', 'botones_tickets')),
              registro_id INTEGER,
              descripcion TEXT,
              datos_anteriores TEXT,
              datos_nuevos TEXT,
              fecha_hora TIMESTAMP DEFAULT (datetime('now', 'localtime')),
              ip_address VARCHAR(45)
            )
          `);
          
          // Copiar datos si la tabla antigua tenía una columna de fecha
          this.db.run(`
            INSERT INTO config_logs (id, accion, tabla_afectada, registro_id, descripcion, datos_anteriores, datos_nuevos, fecha_hora, ip_address)
            SELECT id, accion, tabla_afectada, registro_id, descripcion, datos_anteriores, datos_nuevos, 
                   COALESCE(fecha, timestamp, datetime('now', 'localtime')) as fecha_hora, ip_address
            FROM config_logs_old
          `, (err) => {
            if (err) {
              console.log('No se pudieron migrar datos de config_logs (tabla nueva)');
              // Eliminar tabla antigua de todos modos
              this.db.run('DROP TABLE IF EXISTS config_logs_old');
            } else {
              console.log('Datos migrados exitosamente a config_logs');
              this.db.run('DROP TABLE config_logs_old');
            }
          });
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
    // Nota: ya no insertamos usuarios de prueba automáticamente.
  }

  insertDefaultPuertas() {
    // No insertar puertas por defecto en entornos de producción.
    return;
  }

  insertDefaultRelayConfig() {
    // No insertar configuración de relay por defecto automáticamente.
    return;
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
  
  /**
   * Marca uno o varios tickets como impresos
   * @param {number} ventaId - ID de la venta cuyos tickets se marcarán como impresos
   * @returns {Promise} Promesa que resuelve con el número de tickets actualizados
   */
  marcarTicketComoImpreso(ventaId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE tickets 
         SET impreso = 1, 
             fecha_impresion = datetime('now', 'localtime')
         WHERE venta_id = ? AND impreso = 0`,
        [ventaId],
        function(err) {
          if (err) {
            console.error('Error al marcar ticket como impreso:', err);
            reject(err);
          } else {
            resolve({ 
              ventaId, 
              ticketsActualizados: this.changes 
            });
          }
        }
      );
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
           AND t.impreso = 1
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
      const self = this;
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
      if (relay_number && (relay_number < 1 || relay_number > 4)) {
        reject(new Error('El número de relay debe ser 1, 2, 3 o 4'));
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
            const datosNuevos = {
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
            };

            // Registrar log de creación
            self.registrarLogConfig({
              accion: 'crear',
              tabla_afectada: 'puertas',
              registro_id: datosNuevos.id,
              descripcion: `Creación de puerta: ${datosNuevos.nombre}`,
              datos_anteriores: null,
              datos_nuevos: datosNuevos
            }).catch(err => {
              console.error('Error al registrar log de creación de puerta:', err);
            });

            resolve(datosNuevos);
          }
        }
      );
    });
  }

  // Actualizar una puerta
  updatePuerta(data) {
    return new Promise((resolve, reject) => {
      const self = this;
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
      if (relay_number && (relay_number < 1 || relay_number > 4)) {
        reject(new Error('El número de relay debe ser 1, 2, 3 o 4'));
        return;
      }
      
      // Validar tiempo de apertura si se proporciona
      if (tiempo_apertura_segundos && (tiempo_apertura_segundos < 1 || tiempo_apertura_segundos > 60)) {
        reject(new Error('El tiempo de apertura debe estar entre 1 y 60 segundos'));
        return;
      }
      
      // PASO 1: Obtener datos anteriores para el log
      this.db.get('SELECT * FROM puertas WHERE id = ?', [id], (err, datosAnteriores) => {
        if (err) {
          reject(err);
          return;
        }

        // PASO 2: Actualizar la puerta
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
              const datosNuevos = { 
                id, 
                nombre: nombre.trim(), 
                codigo: codigo.trim().toUpperCase(), 
                descripcion,
                lector_ip: lector_ip ? lector_ip.trim() : null,
                lector_port: lector_port || 5000,
                relay_number: relay_number || null,
                tiempo_apertura_segundos: tiempo_apertura_segundos || 5
              };

              // PASO 3: Registrar el log
              self.registrarLogConfig({
                accion: 'modificar',
                tabla_afectada: 'puertas',
                registro_id: id,
                descripcion: `Modificación de puerta: ${nombre}`,
                datos_anteriores: datosAnteriores,
                datos_nuevos: datosNuevos
              }).catch(err => {
                // Log de error pero no rechazar la operación principal
                console.error('Error al registrar log de modificación de puerta:', err);
              });

              resolve(datosNuevos);
            }
          }
        );
      });
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
      const self = this;
      // PASO 1: Obtener datos de la puerta antes de eliminar
      this.db.get('SELECT * FROM puertas WHERE id = ?', [id], (err, datosAnteriores) => {
        if (err) {
          reject(err);
          return;
        }

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
                  if (err) {
                    reject(err);
                  } else {
                    // Registrar log de desactivación
                    self.registrarLogConfig({
                      accion: 'modificar',
                      tabla_afectada: 'puertas',
                      registro_id: id,
                      descripcion: `Desactivación de puerta: ${datosAnteriores.nombre} (tiene tipos de ticket asociados)`,
                      datos_anteriores: datosAnteriores,
                      datos_nuevos: { ...datosAnteriores, activo: 0 }
                    }).catch(err => {
                      console.error('Error al registrar log de desactivación de puerta:', err);
                    });

                    resolve({ success: true, wasDeactivated: true });
                  }
                }
              );
            } else {
              // Si no hay tipos de ticket, eliminar
              this.db.run(
                'DELETE FROM puertas WHERE id = ?',
                [id],
                (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    // Registrar log de eliminación
                    self.registrarLogConfig({
                      accion: 'eliminar',
                      tabla_afectada: 'puertas',
                      registro_id: id,
                      descripcion: `Eliminación de puerta: ${datosAnteriores.nombre}`,
                      datos_anteriores: datosAnteriores,
                      datos_nuevos: null
                    }).catch(err => {
                      console.error('Error al registrar log de eliminación de puerta:', err);
                    });

                    resolve({ success: true, wasDeactivated: false });
                  }
                }
              );
            }
          }
        );
      });
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
      const self = this;
      const { 
        ip, 
        port, 
        timeout, 
        reintentos,
        modo_rele1 = 'NA',
        modo_rele2 = 'NA',
        modo_rele3 = 'NA',
        modo_rele4 = 'NA'
      } = data;
      
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
      
      // Validar modos de relay
      const validModes = ['NA', 'NC'];
      if (!validModes.includes(modo_rele1) || !validModes.includes(modo_rele2) || 
          !validModes.includes(modo_rele3) || !validModes.includes(modo_rele4)) {
        reject(new Error('Los modos de relay deben ser NA o NC'));
        return;
      }
      
      // PASO 1: Obtener configuración anterior
      this.db.get('SELECT * FROM config_relay WHERE id = 1', [], (err, datosAnteriores) => {
        if (err) {
          reject(err);
          return;
        }

        // PASO 2: Actualizar la configuración
        this.db.run(
          `UPDATE config_relay 
           SET ip = ?, port = ?, timeout = ?, reintentos = ?, 
               modo_rele1 = ?, modo_rele2 = ?, modo_rele3 = ?, modo_rele4 = ?,
               fecha_actualizacion = datetime('now', 'localtime')
           WHERE id = 1`,
          [ip.trim(), port, timeout, reintentos, modo_rele1, modo_rele2, modo_rele3, modo_rele4],
          (err) => {
            if (err) {
              reject(err);
            } else {
              const datosNuevos = {
                id: 1,
                ip: ip.trim(),
                port,
                timeout,
                reintentos,
                modo_rele1,
                modo_rele2,
                modo_rele3,
                modo_rele4,
                fecha_actualizacion: getLocalDateTime()
              };

              // PASO 3: Registrar log
              self.registrarLogConfig({
                accion: 'modificar',
                tabla_afectada: 'config_relay',
                registro_id: 1,
                descripcion: 'Actualización de configuración del relay X-410',
                datos_anteriores: datosAnteriores,
                datos_nuevos: datosNuevos
              }).catch(err => {
                console.error('Error al registrar log de configuración del relay:', err);
              });

              resolve(datosNuevos);
            }
          }
        );
      });
    });
  }

  // ==================== MÉTODOS CRUD PARA BOTONES_TICKETS ====================

  /**
   * Configurar un botón físico para impresión automática
   * @param {Object} config - Configuración del botón
   * @param {number} config.input_numero - Número del input (1-4)
   * @param {number} config.tipo_ticket_id - ID del tipo de ticket a imprimir
   * @param {number} config.cantidad - Cantidad de tickets a imprimir por pulso
   * @param {string} config.descripcion - Descripción del botón
   * @param {boolean} config.activo - Estado activo/inactivo
   * @returns {Promise<Object>} Configuración guardada
   */
  configurarBoton(config) {
    return new Promise((resolve, reject) => {
      const { input_numero, tipo_ticket_id, cantidad = 1, descripcion = '', activo = 1 } = config;

      // Validaciones
      if (!input_numero || input_numero < 1 || input_numero > 4) {
        reject(new Error('El número de input debe estar entre 1 y 4'));
        return;
      }

      if (!tipo_ticket_id) {
        reject(new Error('Debe seleccionar un tipo de ticket'));
        return;
      }

      if (cantidad < 1) {
        reject(new Error('La cantidad debe ser mayor a 0'));
        return;
      }

      // Verificar que el tipo de ticket existe
      this.db.get(
        'SELECT id, nombre FROM tipos_ticket WHERE id = ? AND activo = 1',
        [tipo_ticket_id],
        (err, tipoTicket) => {
          if (err) {
            reject(err);
            return;
          }

          if (!tipoTicket) {
            reject(new Error('El tipo de ticket seleccionado no existe o está inactivo'));
            return;
          }

          // Insertar o actualizar configuración
          this.db.run(
            `INSERT INTO botones_tickets (input_numero, tipo_ticket_id, cantidad, descripcion, activo, fecha_actualizacion)
             VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
             ON CONFLICT(input_numero) DO UPDATE SET
               tipo_ticket_id = excluded.tipo_ticket_id,
               cantidad = excluded.cantidad,
               descripcion = excluded.descripcion,
               activo = excluded.activo,
               fecha_actualizacion = datetime('now', 'localtime')`,
            [input_numero, tipo_ticket_id, cantidad, descripcion || '', activo ? 1 : 0],
            function(err) {
              if (err) {
                reject(err);
              } else {
                // Obtener la configuración guardada
                this.db.get(
                  `SELECT b.*, t.nombre as tipo_ticket_nombre, t.precio as tipo_ticket_precio
                   FROM botones_tickets b
                   JOIN tipos_ticket t ON b.tipo_ticket_id = t.id
                   WHERE b.input_numero = ?`,
                  [input_numero],
                  (err, boton) => {
                    if (err) {
                      reject(err);
                    } else {
                      resolve(boton);
                    }
                  }
                );
              }
            }.bind(this)
          );
        }
      );
    });
  }

  /**
   * Obtener todas las configuraciones de botones
   * @returns {Promise<Array>} Array con las 4 configuraciones (incluye inputs sin configurar)
   */
  obtenerConfigBotones() {
    return new Promise((resolve, reject) => {
      // Obtener todas las configuraciones existentes
      this.db.all(
        `SELECT b.*, t.nombre as tipo_ticket_nombre, t.precio as tipo_ticket_precio
         FROM botones_tickets b
         LEFT JOIN tipos_ticket t ON b.tipo_ticket_id = t.id
         ORDER BY b.input_numero`,
        [],
        (err, botones) => {
          if (err) {
            reject(err);
          } else {
            // Crear array con los 4 inputs (rellenar los que no están configurados)
            const configuraciones = [];
            for (let i = 1; i <= 4; i++) {
              const boton = botones.find(b => b.input_numero === i);
              if (boton) {
                configuraciones.push(boton);
              } else {
                configuraciones.push({
                  id: null,
                  input_numero: i,
                  tipo_ticket_id: null,
                  tipo_ticket_nombre: null,
                  tipo_ticket_precio: null,
                  cantidad: 1,
                  descripcion: '',
                  activo: 0,
                  fecha_creacion: null,
                  fecha_actualizacion: null
                });
              }
            }
            resolve(configuraciones);
          }
        }
      );
    });
  }

  /**
   * Obtener configuración de un botón específico por número de input
   * @param {number} input_numero - Número del input (1-4)
   * @returns {Promise<Object|null>} Configuración del botón o null si no existe
   */
  obtenerBotonPorInput(input_numero) {
    return new Promise((resolve, reject) => {
      if (!input_numero || input_numero < 1 || input_numero > 4) {
        reject(new Error('El número de input debe estar entre 1 y 4'));
        return;
      }

      this.db.get(
        `SELECT b.*, t.nombre as tipo_ticket_nombre, t.precio as tipo_ticket_precio, t.puerta_id
         FROM botones_tickets b
         LEFT JOIN tipos_ticket t ON b.tipo_ticket_id = t.id
         WHERE b.input_numero = ?`,
        [input_numero],
        (err, boton) => {
          if (err) {
            reject(err);
          } else {
            resolve(boton || null);
          }
        }
      );
    });
  }

  /**
   * Desactivar un botón específico
   * @param {number} input_numero - Número del input (1-4)
   * @returns {Promise<void>}
   */
  desactivarBoton(input_numero) {
    return new Promise((resolve, reject) => {
      if (!input_numero || input_numero < 1 || input_numero > 4) {
        reject(new Error('El número de input debe estar entre 1 y 4'));
        return;
      }

      this.db.run(
        `UPDATE botones_tickets 
         SET activo = 0, fecha_actualizacion = datetime('now', 'localtime')
         WHERE input_numero = ?`,
        [input_numero],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Eliminar configuración de un botón
   * @param {number} input_numero - Número del input (1-4)
   * @returns {Promise<void>}
   */
  eliminarBoton(input_numero) {
    return new Promise((resolve, reject) => {
      if (!input_numero || input_numero < 1 || input_numero > 4) {
        reject(new Error('El número de input debe estar entre 1 y 4'));
        return;
      }

      this.db.run(
        'DELETE FROM botones_tickets WHERE input_numero = ?',
        [input_numero],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  // ============================================================================
  // LOGS DE CONFIGURACIÓN
  // ============================================================================

  /**
   * Registrar un cambio en la configuración
   * @param {Object} params
   * @param {string} params.accion - 'crear', 'modificar' o 'eliminar'
   * @param {string} params.tabla_afectada - 'puertas', 'config_relay', 'tipos_ticket', 'botones_tickets'
   * @param {number} params.registro_id - ID del registro afectado
   * @param {string} params.descripcion - Descripción del cambio
   * @param {Object} params.datos_anteriores - Datos antes del cambio (JSON)
   * @param {Object} params.datos_nuevos - Datos después del cambio (JSON)
   * @param {string} params.ip_address - Dirección IP (opcional)
   * @returns {Promise<number>} ID del log creado
   */
  registrarLogConfig({ accion, tabla_afectada, registro_id, descripcion, datos_anteriores, datos_nuevos, ip_address }) {
    return new Promise((resolve, reject) => {
      const accionesValidas = ['crear', 'modificar', 'eliminar'];
      const tablasValidas = ['puertas', 'config_relay', 'tipos_ticket', 'botones_tickets'];

      if (!accionesValidas.includes(accion)) {
        reject(new Error(`Acción inválida. Debe ser: ${accionesValidas.join(', ')}`));
        return;
      }

      if (!tablasValidas.includes(tabla_afectada)) {
        reject(new Error(`Tabla inválida. Debe ser: ${tablasValidas.join(', ')}`));
        return;
      }

      const datosAnterioresStr = datos_anteriores ? JSON.stringify(datos_anteriores) : null;
      const datosNuevosStr = datos_nuevos ? JSON.stringify(datos_nuevos) : null;

      this.db.run(
        `INSERT INTO config_logs (accion, tabla_afectada, registro_id, descripcion, datos_anteriores, datos_nuevos, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [accion, tabla_afectada, registro_id, descripcion, datosAnterioresStr, datosNuevosStr, ip_address],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  /**
   * Obtener logs de configuración con filtros y paginación
   * @param {Object} params
   * @param {number} params.limit - Límite de registros
   * @param {number} params.offset - Offset para paginación
   * @param {string} params.tabla_afectada - Filtrar por tabla (opcional)
   * @param {string} params.accion - Filtrar por acción (opcional)
   * @param {string} params.fecha_desde - Filtrar desde fecha (opcional)
   * @param {string} params.fecha_hasta - Filtrar hasta fecha (opcional)
   * @returns {Promise<Array>} Lista de logs
   */
  obtenerLogsConfig({ limit = 100, offset = 0, tabla_afectada, accion, fecha_desde, fecha_hasta } = {}) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM config_logs WHERE 1=1';
      const params = [];

      if (tabla_afectada) {
        query += ' AND tabla_afectada = ?';
        params.push(tabla_afectada);
      }

      if (accion) {
        query += ' AND accion = ?';
        params.push(accion);
      }

      if (fecha_desde) {
        query += ' AND date(fecha_hora) >= date(?)';
        params.push(fecha_desde);
      }

      if (fecha_hasta) {
        query += ' AND date(fecha_hora) <= date(?)';
        params.push(fecha_hasta);
      }

      query += ' ORDER BY fecha_hora DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Parsear JSON de datos
          const logs = rows.map(row => ({
            ...row,
            datos_anteriores: row.datos_anteriores ? JSON.parse(row.datos_anteriores) : null,
            datos_nuevos: row.datos_nuevos ? JSON.parse(row.datos_nuevos) : null
          }));
          resolve(logs);
        }
      });
    });
  }

  /**
   * Contar total de logs con filtros
   * @param {Object} params - Mismos filtros que obtenerLogsConfig
   * @returns {Promise<number>} Total de registros
   */
  contarLogsConfig({ tabla_afectada, accion, fecha_desde, fecha_hasta } = {}) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT COUNT(*) as total FROM config_logs WHERE 1=1';
      const params = [];

      if (tabla_afectada) {
        query += ' AND tabla_afectada = ?';
        params.push(tabla_afectada);
      }

      if (accion) {
        query += ' AND accion = ?';
        params.push(accion);
      }

      if (fecha_desde) {
        query += ' AND date(fecha_hora) >= date(?)';
        params.push(fecha_desde);
      }

      if (fecha_hasta) {
        query += ' AND date(fecha_hora) <= date(?)';
        params.push(fecha_hasta);
      }

      this.db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.total);
        }
      });
    });
  }

  /**
   * Obtener estadísticas de logs
   * @returns {Promise<Object>} Estadísticas de cambios
   */
  obtenerEstadisticasLogs() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          tabla_afectada,
          accion,
          COUNT(*) as cantidad,
          MAX(fecha_hora) as ultima_modificacion
        FROM config_logs
        GROUP BY tabla_afectada, accion
        ORDER BY tabla_afectada, accion
      `;

      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Limpiar logs antiguos (mantener solo los últimos N días)
   * @param {number} dias - Número de días a mantener (por defecto 90)
   * @returns {Promise<number>} Cantidad de registros eliminados
   */
  limpiarLogsAntiguos(dias = 90) {
    return new Promise((resolve, reject) => {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - dias);
      const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];

      this.db.run(
        'DELETE FROM config_logs WHERE date(fecha_hora) < date(?)',
        [fechaLimiteStr],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  /**
   * Obtener historial de un registro específico
   * @param {string} tabla - Nombre de la tabla
   * @param {number} registro_id - ID del registro
   * @returns {Promise<Array>} Historial de cambios
   */
  obtenerHistorialRegistro(tabla, registro_id) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM config_logs 
         WHERE tabla_afectada = ? AND registro_id = ?
         ORDER BY fecha_hora DESC`,
        [tabla, registro_id],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            const logs = rows.map(row => ({
              ...row,
              datos_anteriores: row.datos_anteriores ? JSON.parse(row.datos_anteriores) : null,
              datos_nuevos: row.datos_nuevos ? JSON.parse(row.datos_nuevos) : null
            }));
            resolve(logs);
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