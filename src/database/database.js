const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database.sqlite');

class Database {
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

      // Tabla de tipos de tickets
      this.db.run(`
        CREATE TABLE IF NOT EXISTS tipos_ticket (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre VARCHAR(50) NOT NULL,
          precio DECIMAL(10,2) NOT NULL,
          activo BOOLEAN DEFAULT 1,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
          codigo_qr VARCHAR(100) UNIQUE NOT NULL,
          precio DECIMAL(10,2) NOT NULL,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          anulado BOOLEAN DEFAULT 0,
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
        'SELECT * FROM tipos_ticket ORDER BY id DESC',
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
        'SELECT * FROM tipos_ticket WHERE activo = 1 ORDER BY id DESC',
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Registrar una nueva venta
  createSale(userId, ticketTypeId, totalAmount) {
    return new Promise((resolve, reject) => {
      const qrCode = this.generateUniqueQRCode();
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

          console.log('Venta creada con ID:', ventaId); // Debug log

          // Insertar el ticket
          await runQuery(
            'INSERT INTO tickets (venta_id, tipo_ticket_id, codigo_qr, precio) VALUES (?, ?, ?, ?)',
            [ventaId, ticketTypeId, qrCode, totalAmount]
          );

          // Confirmar transacción
          await runQuery('COMMIT', []);

          // Retornar resultado
          resolve({
            ventaId,
            qrCode,
            ticketTypeId,
            precio: totalAmount,
            fecha: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error en la transacción:', error); // Debug log
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

  // Crear un nuevo tipo de ticket
  createTicketType(data) {
    return new Promise((resolve, reject) => {
      const { nombre, precio } = data;
      this.db.run(
        'INSERT INTO tipos_ticket (nombre, precio) VALUES (?, ?)',
        [nombre, precio],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              nombre,
              precio,
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
      const { id, nombre, precio } = data;
      this.db.run(
        'UPDATE tipos_ticket SET nombre = ?, precio = ? WHERE id = ?',
        [nombre, precio, id],
        (err) => {
          if (err) reject(err);
          else resolve({ id, nombre, precio });
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

  close() {
    this.db.close();
  }
}

module.exports = Database;