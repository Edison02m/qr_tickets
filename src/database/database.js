const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database.sqlite');

class Database {
  constructor() {
    this.db = new sqlite3.Database(dbPath);
    this.initialize();
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
      // Insertar tipos de tickets por defecto
      this.insertDefaultTicketTypes();
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

  insertDefaultTicketTypes() {
    const tipos = [
      { nombre: 'Niño', precio: 50.00 },
      { nombre: 'Adulto', precio: 100.00 },
      { nombre: 'Vehículo', precio: 30.00 }
    ];

    tipos.forEach(tipo => {
      this.db.run(`
        INSERT OR IGNORE INTO tipos_ticket (nombre, precio)
        VALUES (?, ?)
      `, [tipo.nombre, tipo.precio]);
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

  close() {
    this.db.close();
  }
}

module.exports = Database;