/**
 * Database.js - Versión MySQL
 * Sistema de Venta de Tickets con Control de Acceso
 * Convertido de SQLite a MySQL para soporte multi-computadora
 */

const { getPool } = require('./mysql-config');
const bcrypt = require('bcryptjs');

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Obtener fecha y hora local en formato MySQL (ajustado a zona horaria local)
 * @returns {string} Fecha en formato 'YYYY-MM-DD HH:MM:SS'
 */
function getLocalDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Obtener solo la fecha local en formato MySQL (ajustado a zona horaria local)
 * @param {Date} date - Fecha a formatear
 * @returns {string} Fecha en formato 'YYYY-MM-DD'
 */
function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// ============================================
// CLASE DATABASE
// ============================================

class Database {
  constructor() {
    this.pool = getPool();
    console.log('🗄️  Database class initialized (MySQL)');
  }

  /**
   * Ejecutar query con manejo de errores
   * @private
   */
  async query(sql, params = []) {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('❌ Database query error:', error.message);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  // ============================================
  // INICIALIZACIÓN
  // ============================================

  async initialize() {
    try {
      console.log('🚀 Inicializando base de datos MySQL...');
      
      // MySQL crea las tablas desde el script SQL inicial
      // Aquí solo verificamos que las tablas existan
      const tables = await this.query('SHOW TABLES');
      console.log(`✅ Base de datos conectada. Tablas encontradas: ${tables.length}`);
      
      // Insertar usuarios por defecto si no existen
      await this.insertDefaultUsers();
      
      // Insertar configuración de relay por defecto si no existe
      await this.insertDefaultRelayConfig();
      
      return true;
    } catch (error) {
      console.error('❌ Error inicializando base de datos:', error);
      throw error;
    }
  }

  async insertDefaultUsers() {
    try {
      const hashedAdminPassword = bcrypt.hashSync('admin123', 10);
      
      // Verificar si el admin ya existe
      const [existing] = await this.query(
        'SELECT id FROM usuarios WHERE usuario = ?',
        ['admin']
      );
      
      if (!existing) {
        await this.query(
          `INSERT INTO usuarios (nombre, usuario, password, rol) 
           VALUES (?, ?, ?, ?)`,
          ['Administrador', 'admin', hashedAdminPassword, 'admin']
        );
        console.log('✅ Usuario administrador creado');
      }
    } catch (error) {
      console.error('⚠️ Error insertando usuarios por defecto:', error.message);
    }
  }

  async insertDefaultRelayConfig() {
    try {
      // Verificar si ya existe configuración
      const [existing] = await this.query(
        'SELECT id FROM config_relay WHERE id = 1'
      );
      
      if (!existing) {
        await this.query(
          `INSERT INTO config_relay (id, ip, port, timeout, reintentos) 
           VALUES (1, '192.168.3.200', 80, 3000, 3)`
        );
        console.log('✅ Configuración de relay creada');
      }
    } catch (error) {
      console.error('⚠️ Error insertando configuración de relay:', error.message);
    }
  }

  async insertDefaultPuertas() {
    // No insertar puertas por defecto en entornos de producción.
    return;
  }

  // ============================================
  // MÉTODOS DE USUARIOS
  // ============================================

  async getUserByUsername(usuario) {
    try {
      const [user] = await this.query(
        'SELECT * FROM usuarios WHERE usuario = ? AND activo = 1',
        [usuario]
      );
      return user || null;
    } catch (error) {
      throw error;
    }
  }

  async getUsers() {
    try {
      const users = await this.query(
        'SELECT * FROM usuarios ORDER BY id DESC'
      );
      return users;
    } catch (error) {
      throw error;
    }
  }

  async createUser(data, adminUser = null) {
    const { nombre, usuario, password, rol } = data;
    
    try {
      // Validaciones
      if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre del usuario no puede estar vacío');
      }
      
      if (!usuario || usuario.trim() === '') {
        throw new Error('El nombre de usuario no puede estar vacío');
      }
      
      if (!password || password.trim() === '') {
        throw new Error('La contraseña no puede estar vacía');
      }
      
      if (!['vendedor', 'admin'].includes(rol)) {
        throw new Error('El rol debe ser "vendedor" o "admin"');
      }
      
      // Hash de la contraseña
      const hashedPassword = bcrypt.hashSync(password, 10);
      
      // Insertar usuario
      const result = await this.query(
        `INSERT INTO usuarios (nombre, usuario, password, rol) 
         VALUES (?, ?, ?, ?)`,
        [nombre.trim(), usuario.trim(), hashedPassword, rol]
      );
      
      const datosNuevos = {
        id: result.insertId,
        nombre: nombre.trim(),
        usuario: usuario.trim(),
        rol,
        activo: 1,
        fecha_creacion: getLocalDateTime()
      };

      // Registrar log
      await this.registrarLogConfig({
        accion: 'crear',
        tabla_afectada: 'usuarios',
        registro_id: result.insertId,
        descripcion: `Creación de usuario: ${nombre.trim()} (${rol})`,
        datos_anteriores: null,
        datos_nuevos: { ...datosNuevos, password: '***' }, // No guardar password en log
        usuario_id: adminUser?.id || null,
        usuario_nombre: adminUser?.nombre || null
      }).catch(err => console.error('Error al registrar log:', err));
      
      return datosNuevos;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error(`Ya existe un usuario con el nombre de usuario "${usuario.trim()}"`);
      }
      throw error;
    }
  }

  async updateUser(data, adminUser = null) {
    const { id, nombre, usuario, rol } = data;
    
    try {
      // Validaciones
      if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre del usuario no puede estar vacío');
      }
      
      if (!usuario || usuario.trim() === '') {
        throw new Error('El nombre de usuario no puede estar vacío');
      }
      
      if (!['vendedor', 'admin'].includes(rol)) {
        throw new Error('El rol debe ser "vendedor" o "admin"');
      }

      // Obtener datos anteriores
      const [usuarioAnterior] = await this.query(
        'SELECT id, nombre, usuario, rol, activo FROM usuarios WHERE id = ?',
        [id]
      );
      
      await this.query(
        `UPDATE usuarios 
         SET nombre = ?, usuario = ?, rol = ? 
         WHERE id = ?`,
        [nombre.trim(), usuario.trim(), rol, id]
      );
      
      const datosNuevos = { id, nombre: nombre.trim(), usuario: usuario.trim(), rol };

      // Registrar log
      await this.registrarLogConfig({
        accion: 'modificar',
        tabla_afectada: 'usuarios',
        registro_id: id,
        descripcion: `Modificación de usuario: ${nombre.trim()}`,
        datos_anteriores: usuarioAnterior || null,
        datos_nuevos: datosNuevos,
        usuario_id: adminUser?.id || null,
        usuario_nombre: adminUser?.nombre || null
      }).catch(err => console.error('Error al registrar log:', err));

      return datosNuevos;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error(`Ya existe otro usuario con el nombre de usuario "${usuario.trim()}"`);
      }
      throw error;
    }
  }

  async changeUserPassword(id, newPassword, adminUser = null) {
    try {
      if (!newPassword || newPassword.trim() === '') {
        throw new Error('La nueva contraseña no puede estar vacía');
      }

      // Obtener nombre del usuario afectado
      const [usuarioAfectado] = await this.query(
        'SELECT nombre, usuario FROM usuarios WHERE id = ?',
        [id]
      );
      
      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      
      await this.query(
        'UPDATE usuarios SET password = ? WHERE id = ?',
        [hashedPassword, id]
      );

      // Registrar log
      await this.registrarLogConfig({
        accion: 'modificar',
        tabla_afectada: 'usuarios',
        registro_id: id,
        descripcion: `Cambio de contraseña del usuario: ${usuarioAfectado?.nombre || 'ID ' + id}`,
        datos_anteriores: { password: '***' },
        datos_nuevos: { password: '*** (nueva)' },
        usuario_id: adminUser?.id || null,
        usuario_nombre: adminUser?.nombre || null
      }).catch(err => console.error('Error al registrar log:', err));
      
      return { id, success: true };
    } catch (error) {
      throw error;
    }
  }

  async toggleUserStatus(id, active, adminUser = null) {
    try {
      // Obtener datos anteriores
      const [usuarioAnterior] = await this.query(
        'SELECT id, nombre, usuario, rol, activo FROM usuarios WHERE id = ?',
        [id]
      );

      await this.query(
        'UPDATE usuarios SET activo = ? WHERE id = ?',
        [active ? 1 : 0, id]
      );
      
      const accionTexto = active ? 'Activación' : 'Desactivación';

      // Registrar log
      await this.registrarLogConfig({
        accion: 'modificar',
        tabla_afectada: 'usuarios',
        registro_id: id,
        descripcion: `${accionTexto} de usuario: ${usuarioAnterior?.nombre || 'ID ' + id}`,
        datos_anteriores: { activo: usuarioAnterior?.activo },
        datos_nuevos: { activo: active ? 1 : 0 },
        usuario_id: adminUser?.id || null,
        usuario_nombre: adminUser?.nombre || null
      }).catch(err => console.error('Error al registrar log:', err));

      return { id, activo: active };
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(id, adminUser = null) {
    try {
      // Verificar si el usuario existe
      const [user] = await this.query(
        'SELECT * FROM usuarios WHERE id = ?',
        [id]
      );
      
      if (!user) {
        throw new Error('El usuario no existe');
      }
      
      // Verificar si tiene ventas asociadas
      const [ventasCount] = await this.query(
        'SELECT COUNT(*) as count FROM ventas WHERE usuario_id = ?',
        [id]
      );
      
      if (ventasCount.count > 0) {
        throw new Error(
          `No se puede eliminar el usuario "${user.nombre}" porque tiene ${ventasCount.count} venta(s) registrada(s).\n\nPuede desactivarlo en su lugar.`
        );
      }
      
      // Eliminar usuario
      await this.query('DELETE FROM usuarios WHERE id = ?', [id]);

      // Registrar log
      await this.registrarLogConfig({
        accion: 'eliminar',
        tabla_afectada: 'usuarios',
        registro_id: id,
        descripcion: `Eliminación de usuario: ${user.nombre} (${user.usuario})`,
        datos_anteriores: { 
          id: user.id, 
          nombre: user.nombre, 
          usuario: user.usuario, 
          rol: user.rol, 
          activo: user.activo 
        },
        datos_nuevos: null,
        usuario_id: adminUser?.id || null,
        usuario_nombre: adminUser?.nombre || null
      }).catch(err => console.error('Error al registrar log:', err));
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  // ============================================
  // MÉTODOS DE TIPOS DE TICKETS
  // ============================================

  async getTicketTypes() {
    try {
      const rows = await this.query(`
        SELECT tt.*, 
               GROUP_CONCAT(p.id ORDER BY p.id) as puerta_ids,
               GROUP_CONCAT(p.nombre ORDER BY p.id SEPARATOR ',') as puerta_nombres,
               GROUP_CONCAT(p.codigo ORDER BY p.id SEPARATOR ',') as puerta_codigos
        FROM tipos_ticket tt
        LEFT JOIN tipos_ticket_puertas ttp ON tt.id = ttp.tipo_ticket_id
        LEFT JOIN puertas p ON ttp.puerta_id = p.id
        GROUP BY tt.id
        ORDER BY tt.id DESC
      `);
      
      // Transformar resultados
      const ticketTypes = rows.map(row => ({
        ...row,
        puertas: row.puerta_ids ? row.puerta_ids.split(',').map((id, index) => ({
          id: parseInt(id),
          nombre: row.puerta_nombres.split(',')[index],
          codigo: row.puerta_codigos.split(',')[index]
        })) : []
      }));
      
      return ticketTypes;
    } catch (error) {
      throw error;
    }
  }

  async getActiveTicketTypes() {
    try {
      const rows = await this.query(`
        SELECT tt.*, 
               GROUP_CONCAT(p.id ORDER BY p.id) as puerta_ids,
               GROUP_CONCAT(p.nombre ORDER BY p.id SEPARATOR ',') as puerta_nombres,
               GROUP_CONCAT(p.codigo ORDER BY p.id SEPARATOR ',') as puerta_codigos
        FROM tipos_ticket tt
        LEFT JOIN tipos_ticket_puertas ttp ON tt.id = ttp.tipo_ticket_id
        LEFT JOIN puertas p ON ttp.puerta_id = p.id
        WHERE tt.activo = 1
        GROUP BY tt.id
        ORDER BY tt.id DESC
      `);
      
      // Transformar resultados
      const ticketTypes = rows.map(row => ({
        ...row,
        puertas: row.puerta_ids ? row.puerta_ids.split(',').map((id, index) => ({
          id: parseInt(id),
          nombre: row.puerta_nombres.split(',')[index],
          codigo: row.puerta_codigos.split(',')[index]
        })) : []
      }));
      
      return ticketTypes;
    } catch (error) {
      throw error;
    }
  }

  async createTicketType(data) {
    const { nombre, precio, puerta_ids = [] } = data;
    
    try {
      // Validaciones
      if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre del tipo de ticket no puede estar vacío');
      }
      
      if (nombre.trim().length < 3) {
        throw new Error('El nombre del tipo de ticket debe tener al menos 3 caracteres');
      }
      
      if (!precio || isNaN(precio)) {
        throw new Error('El precio debe ser un número válido');
      }
      
      if (precio <= 0) {
        throw new Error('El precio debe ser mayor a $0');
      }
      
      if (precio > 999999) {
        throw new Error('El precio no puede ser mayor a $999,999');
      }
      
      // Iniciar transacción
      const connection = await this.pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // Insertar tipo de ticket
        const [result] = await connection.execute(
          'INSERT INTO tipos_ticket (nombre, precio) VALUES (?, ?)',
          [nombre.trim(), precio]
        );
        
        const tipoTicketId = result.insertId;
        
        // Insertar relaciones con puertas
        if (Array.isArray(puerta_ids) && puerta_ids.length > 0) {
          const puertasValidas = puerta_ids.filter(id => id && !isNaN(id) && id > 0);
          
          for (const puertaId of puertasValidas) {
            await connection.execute(
              'INSERT INTO tipos_ticket_puertas (tipo_ticket_id, puerta_id) VALUES (?, ?)',
              [tipoTicketId, puertaId]
            );
          }
        }
        
        await connection.commit();
        connection.release();
        
        return {
          id: tipoTicketId,
          nombre: nombre.trim(),
          precio,
          puertas: [],
          activo: 1,
          fecha_creacion: getLocalDateTime()
        };
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error(`Ya existe un tipo de ticket llamado "${nombre.trim()}". Por favor use otro nombre.`);
      }
      throw error;
    }
  }

  async updateTicketType(data) {
    const { id, nombre, precio, puerta_ids = [] } = data;
    
    try {
      // Validaciones
      if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre del tipo de ticket no puede estar vacío');
      }
      
      if (nombre.trim().length < 3) {
        throw new Error('El nombre del tipo de ticket debe tener al menos 3 caracteres');
      }
      
      if (!precio || isNaN(precio)) {
        throw new Error('El precio debe ser un número válido');
      }
      
      if (precio <= 0) {
        throw new Error('El precio debe ser mayor a $0');
      }
      
      if (precio > 999999) {
        throw new Error('El precio no puede ser mayor a $999,999');
      }
      
      // Iniciar transacción
      const connection = await this.pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // Actualizar tipo de ticket
        await connection.execute(
          'UPDATE tipos_ticket SET nombre = ?, precio = ? WHERE id = ?',
          [nombre.trim(), precio, id]
        );
        
        // Eliminar relaciones anteriores
        await connection.execute(
          'DELETE FROM tipos_ticket_puertas WHERE tipo_ticket_id = ?',
          [id]
        );
        
        // Insertar nuevas relaciones
        if (Array.isArray(puerta_ids) && puerta_ids.length > 0) {
          for (const puertaId of puerta_ids) {
            await connection.execute(
              'INSERT INTO tipos_ticket_puertas (tipo_ticket_id, puerta_id) VALUES (?, ?)',
              [id, puertaId]
            );
          }
        }
        
        await connection.commit();
        connection.release();
        
        return { id, nombre: nombre.trim(), precio, puertas: [] };
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error(`Ya existe otro tipo de ticket llamado "${nombre.trim()}". Por favor use otro nombre.`);
      }
      throw error;
    }
  }

  async toggleTicketTypeStatus(id, active) {
    try {
      await this.query(
        'UPDATE tipos_ticket SET activo = ? WHERE id = ?',
        [active ? 1 : 0, id]
      );
      
      return { id, activo: active };
    } catch (error) {
      throw error;
    }
  }

  async deleteTicketType(id) {
    try {
      // Verificar si el tipo de ticket existe
      const [tipoTicket] = await this.query(
        'SELECT * FROM tipos_ticket WHERE id = ?',
        [id]
      );
      
      if (!tipoTicket) {
        throw new Error('El tipo de ticket no existe');
      }
      
      // Verificar si hay tickets vendidos
      const [ticketCount] = await this.query(
        'SELECT COUNT(*) as count FROM tickets WHERE tipo_ticket_id = ?',
        [id]
      );
      
      if (ticketCount.count > 0) {
        const mensaje = ticketCount.count === 1
          ? `No se puede eliminar "${tipoTicket.nombre}" porque existe 1 ticket vendido con este tipo.\n\nPuede desactivarlo en su lugar para que no aparezca en ventas nuevas.`
          : `No se puede eliminar "${tipoTicket.nombre}" porque existen ${ticketCount.count} tickets vendidos con este tipo.\n\nPuede desactivarlo en su lugar para que no aparezca en ventas nuevas.`;
        
        throw new Error(mensaje);
      }
      
      // Eliminar relaciones y luego el tipo
      await this.query(
        'DELETE FROM tipos_ticket_puertas WHERE tipo_ticket_id = ?',
        [id]
      );
      
      await this.query('DELETE FROM tipos_ticket WHERE id = ?', [id]);
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  async getTicketTypeDoors(tipoTicketId) {
    try {
      const puertas = await this.query(`
        SELECT p.* 
        FROM puertas p
        INNER JOIN tipos_ticket_puertas ttp ON p.id = ttp.puerta_id
        WHERE ttp.tipo_ticket_id = ?
        ORDER BY p.nombre
      `, [tipoTicketId]);
      
      return puertas;
    } catch (error) {
      throw error;
    }
  }

  // ============================================
  // MÉTODOS DE PUERTAS
  // ============================================

  async getPuertas() {
    try {
      const puertas = await this.query(
        'SELECT * FROM puertas ORDER BY id DESC'
      );
      return puertas;
    } catch (error) {
      throw error;
    }
  }

  async getActivePuertas() {
    try {
      const puertas = await this.query(
        'SELECT * FROM puertas WHERE activo = 1 ORDER BY nombre ASC'
      );
      return puertas;
    } catch (error) {
      throw error;
    }
  }

  async createPuerta(data) {
    const { nombre, codigo, descripcion, lector_ip, lector_port, relay_number, tiempo_apertura_segundos } = data;
    
    try {
      // Validaciones
      if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre de la puerta no puede estar vacío');
      }
      
      if (nombre.trim().length < 3) {
        throw new Error('El nombre de la puerta debe tener al menos 3 caracteres');
      }
      
      if (!codigo || codigo.trim() === '') {
        throw new Error('El código de la puerta no puede estar vacío');
      }
      
      if (!/^[A-Za-z0-9]+$/.test(codigo.trim())) {
        throw new Error('El código solo puede contener letras y números (sin espacios ni caracteres especiales)');
      }
      
      if (lector_ip && lector_ip.trim() !== '' && !/^(\d{1,3}\.){3}\d{1,3}$/.test(lector_ip.trim())) {
        throw new Error('La dirección IP del lector no es válida. Use el formato: 192.168.1.100');
      }
      
      if (lector_port && (lector_port < 1 || lector_port > 65535)) {
        throw new Error('El puerto del lector debe estar entre 1 y 65535');
      }
      
      if (relay_number && (relay_number < 1 || relay_number > 4)) {
        throw new Error('El número de relay debe ser 1, 2, 3 o 4');
      }
      
      if (tiempo_apertura_segundos && (tiempo_apertura_segundos < 1 || tiempo_apertura_segundos > 60)) {
        throw new Error('El tiempo de apertura debe estar entre 1 y 60 segundos');
      }
      
      const result = await this.query(
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
        ]
      );
      
      const datosNuevos = {
        id: result.insertId,
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
      
      // Registrar log
      await this.registrarLogConfig({
        accion: 'crear',
        tabla_afectada: 'puertas',
        registro_id: datosNuevos.id,
        descripcion: `Creación de puerta: ${datosNuevos.nombre}`,
        datos_anteriores: null,
        datos_nuevos: datosNuevos
      }).catch(err => console.error('Error al registrar log:', err));
      
      return datosNuevos;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('codigo')) {
          throw new Error(`Ya existe una puerta con el código "${codigo.trim().toUpperCase()}". Por favor use otro código.`);
        } else {
          throw new Error(`Ya existe una puerta con el nombre "${nombre.trim()}". Por favor use otro nombre.`);
        }
      }
      throw error;
    }
  }

  async updatePuerta(data) {
    const { id, nombre, codigo, descripcion, lector_ip, lector_port, relay_number, tiempo_apertura_segundos } = data;
    
    try {
      // Validaciones (mismas que createPuerta)
      if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre de la puerta no puede estar vacío');
      }
      
      if (nombre.trim().length < 3) {
        throw new Error('El nombre de la puerta debe tener al menos 3 caracteres');
      }
      
      if (!codigo || codigo.trim() === '') {
        throw new Error('El código de la puerta no puede estar vacío');
      }
      
      if (!/^[A-Za-z0-9]+$/.test(codigo.trim())) {
        throw new Error('El código solo puede contener letras y números (sin espacios ni caracteres especiales)');
      }
      
      if (lector_ip && lector_ip.trim() !== '' && !/^(\d{1,3}\.){3}\d{1,3}$/.test(lector_ip.trim())) {
        throw new Error('La dirección IP del lector no es válida. Use el formato: 192.168.1.100');
      }
      
      if (lector_port && (lector_port < 1 || lector_port > 65535)) {
        throw new Error('El puerto del lector debe estar entre 1 y 65535');
      }
      
      if (relay_number && (relay_number < 1 || relay_number > 4)) {
        throw new Error('El número de relay debe ser 1, 2, 3 o 4');
      }
      
      if (tiempo_apertura_segundos && (tiempo_apertura_segundos < 1 || tiempo_apertura_segundos > 60)) {
        throw new Error('El tiempo de apertura debe estar entre 1 y 60 segundos');
      }
      
      // Obtener datos anteriores
      const [datosAnteriores] = await this.query(
        'SELECT * FROM puertas WHERE id = ?',
        [id]
      );
      
      if (!datosAnteriores) {
        throw new Error('La puerta que intenta actualizar no existe');
      }
      
      await this.query(
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
        ]
      );
      
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
      
      // Registrar log
      await this.registrarLogConfig({
        accion: 'modificar',
        tabla_afectada: 'puertas',
        registro_id: id,
        descripcion: `Modificación de puerta: ${nombre}`,
        datos_anteriores: datosAnteriores,
        datos_nuevos: datosNuevos
      }).catch(err => console.error('Error al registrar log:', err));
      
      return datosNuevos;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('codigo')) {
          throw new Error(`Ya existe otra puerta con el código "${codigo.trim().toUpperCase()}". Por favor use otro código.`);
        } else {
          throw new Error(`Ya existe otra puerta con el nombre "${nombre.trim()}". Por favor use otro nombre.`);
        }
      }
      throw error;
    }
  }

  async togglePuertaStatus(id, active) {
    try {
      await this.query(
        'UPDATE puertas SET activo = ? WHERE id = ?',
        [active ? 1 : 0, id]
      );
      
      return { id, activo: active };
    } catch (error) {
      throw error;
    }
  }

  async deletePuerta(id) {
    try {
      // Verificar si existe
      const [puerta] = await this.query(
        'SELECT * FROM puertas WHERE id = ?',
        [id]
      );
      
      if (!puerta) {
        throw new Error('La puerta que intenta eliminar no existe');
      }
      
      // Verificar asignaciones
      const tiposTicket = await this.query(`
        SELECT tt.id, tt.nombre 
        FROM tipos_ticket tt
        INNER JOIN tipos_ticket_puertas ttp ON tt.id = ttp.tipo_ticket_id
        WHERE ttp.puerta_id = ?
      `, [id]);
      
      if (tiposTicket.length > 0) {
        const nombresTickets = tiposTicket.map(t => `"${t.nombre}"`).join(', ');
        throw new Error(
          `No se puede eliminar la puerta "${puerta.nombre}" porque está asignada a ${tiposTicket.length} tipo(s) de ticket: ${nombresTickets}.\n\nPuede desactivarla en su lugar para que no esté disponible sin perder el historial.`
        );
      }
      
      // Eliminar relaciones y puerta
      await this.query(
        'DELETE FROM tipos_ticket_puertas WHERE puerta_id = ?',
        [id]
      );
      
      await this.query('DELETE FROM puertas WHERE id = ?', [id]);
      
      // Registrar log
      await this.registrarLogConfig({
        accion: 'eliminar',
        tabla_afectada: 'puertas',
        registro_id: id,
        descripcion: `Eliminación de puerta: ${puerta.nombre}`,
        datos_anteriores: puerta,
        datos_nuevos: null
      }).catch(err => console.error('Error al registrar log:', err));
      
      return { success: true, wasDeactivated: false };
    } catch (error) {
      throw error;
    }
  }

  // ============================================
  // MÉTODOS DE VENTAS Y TICKETS
  // ============================================

  async createSale(userId, ticketTypeId, totalAmount, qrCode, puertaCodigo) {
    try {
      console.log('🎫 createSale - INICIO:', { userId, ticketTypeId, totalAmount, qrCode, puertaCodigo });
      
      // Validaciones
      if (!userId || typeof userId !== 'number') {
        console.error('❌ createSale - Error: ID de usuario inválido:', userId);
        throw new Error('ID de usuario inválido');
      }
      
      if (!ticketTypeId || typeof ticketTypeId !== 'number') {
        console.error('❌ createSale - Error: ID de tipo de ticket inválido:', ticketTypeId);
        throw new Error('ID de tipo de ticket inválido');
      }
      
      if (!totalAmount || typeof totalAmount !== 'number' || totalAmount <= 0) {
        console.error('❌ createSale - Error: Monto inválido:', totalAmount);
        throw new Error('El monto total debe ser mayor a $0');
      }
      
      if (!qrCode || typeof qrCode !== 'string' || qrCode.trim() === '') {
        console.error('❌ createSale - Error: QR vacío:', qrCode);
        throw new Error('El código QR no puede estar vacío');
      }
      
      const partesQR = qrCode.split('-');
      if (partesQR.length !== 4) {
        console.error('❌ createSale - Error: Formato QR inválido:', { qrCode, partes: partesQR.length });
        throw new Error('Formato de código QR inválido (debe tener 4 partes)');
      }
      
      console.log('✅ createSale - Validaciones OK, iniciando transacción...');
      
      // Iniciar transacción
      const connection = await this.pool.getConnection();
      console.log('✅ createSale - Conexión obtenida');
      
      await connection.beginTransaction();
      console.log('✅ createSale - Transacción iniciada');
      
      try {
        // Insertar venta
        console.log('📝 createSale - Insertando venta:', { userId, totalAmount });
        const [ventaResult] = await connection.execute(
          'INSERT INTO ventas (usuario_id, total) VALUES (?, ?)',
          [userId, totalAmount]
        );
        
        const ventaId = ventaResult.insertId;
        console.log('✅ createSale - Venta insertada con ID:', ventaId);
        
        // Insertar ticket
        console.log('📝 createSale - Insertando ticket:', { ventaId, ticketTypeId, qrCode, puertaCodigo, totalAmount });
        await connection.execute(
          'INSERT INTO tickets (venta_id, tipo_ticket_id, codigo_qr, puerta_codigo, precio) VALUES (?, ?, ?, ?, ?)',
          [ventaId, ticketTypeId, qrCode, puertaCodigo || null, totalAmount]
        );
        console.log('✅ createSale - Ticket insertado');
        
        await connection.commit();
        console.log('✅ createSale - Transacción confirmada');
        
        connection.release();
        console.log('✅ createSale - Conexión liberada');
        
        const result = {
          ventaId,
          qrCode,
          ticketTypeId,
          precio: totalAmount,
          puertaCodigo,
          fecha: getLocalDateTime()
        };
        
        console.log('✅ createSale - ÉXITO:', result);
        return result;
      } catch (error) {
        console.error('❌ createSale - Error en transacción:', error);
        await connection.rollback();
        console.log('🔄 createSale - Transacción revertida');
        
        connection.release();
        console.log('🔄 createSale - Conexión liberada después de error');
        
        if (error.code === 'ER_DUP_ENTRY') {
          throw new Error('Este código QR ya existe. Por favor genere uno nuevo.');
        }
        throw error;
      }
    } catch (error) {
      console.error('❌ createSale - Error general:', error);
      throw error;
    }
  }

  async marcarTicketComoImpreso(ventaId) {
    try {
      const fechaImpresion = getLocalDateTime();
      const result = await this.query(
        `UPDATE tickets 
         SET impreso = 1, fecha_impresion = ?
         WHERE venta_id = ? AND impreso = 0`,
        [fechaImpresion, ventaId]
      );
      
      return {
        ventaId,
        ticketsActualizados: result.affectedRows
      };
    } catch (error) {
      throw error;
    }
  }

  async getDailySales(userId) {
    try {
      const today = getLocalDate();
      
      const sales = await this.query(`
        SELECT v.*, t.codigo_qr, t.precio as ticket_precio, tt.nombre as tipo_ticket
        FROM ventas v
        JOIN tickets t ON v.id = t.venta_id
        JOIN tipos_ticket tt ON t.tipo_ticket_id = tt.id
        WHERE v.usuario_id = ? 
        AND DATE(v.fecha_venta) = DATE(?)
        AND v.anulada = 0
        ORDER BY v.fecha_venta DESC
      `, [userId, today]);
      
      return sales;
    } catch (error) {
      throw error;
    }
  }

  async getVendedorDailySummary(userId, fecha = null) {
    try {
      const fechaConsulta = fecha || getLocalDate();
      
      const rows = await this.query(`
        SELECT 
          tt.nombre as tipo_ticket,
          COUNT(t.id) as cantidad_tickets,
          SUM(t.precio) as total_tipo
        FROM tickets t
        JOIN ventas v ON t.venta_id = v.id
        JOIN tipos_ticket tt ON t.tipo_ticket_id = tt.id
        WHERE v.usuario_id = ? 
          AND DATE(v.fecha_venta) = DATE(?)
          AND v.anulada = 0
          AND v.cierre_caja_id IS NULL
          AND t.anulado = 0
        GROUP BY tt.id, tt.nombre
        ORDER BY tt.nombre
      `, [userId, fechaConsulta]);
      
      const totalTickets = rows.reduce((sum, row) => sum + parseInt(row.cantidad_tickets), 0);
      const totalVentas = rows.reduce((sum, row) => sum + parseFloat(row.total_tipo || 0), 0);
      
      return {
        fecha: fechaConsulta,
        total_tickets: totalTickets,
        total_ventas: totalVentas,
        detalle_por_tipo: rows
      };
    } catch (error) {
      throw error;
    }
  }

  async getAllDailySales() {
    try {
      const sales = await this.query(`
        SELECT v.*, 
               t.id as ticket_id,
               t.codigo_qr, 
               t.precio as ticket_precio, 
               t.usado,
               t.anulado,
               t.impreso,
               t.fecha_uso,
               t.fecha_impresion,
               tt.nombre as tipo_ticket, 
               u.nombre as vendedor
        FROM ventas v
        JOIN tickets t ON v.id = t.venta_id
        JOIN tipos_ticket tt ON t.tipo_ticket_id = tt.id
        JOIN usuarios u ON v.usuario_id = u.id
        WHERE v.anulada = 0
        ORDER BY v.fecha_venta DESC
      `);
      
      return sales;
    } catch (error) {
      throw error;
    }
  }

  async annulSale(ventaId) {
    try {
      const connection = await this.pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // Anular venta
        await connection.execute(
          'UPDATE ventas SET anulada = 1 WHERE id = ?',
          [ventaId]
        );
        
        // Anular tickets
        await connection.execute(
          'UPDATE tickets SET anulado = 1 WHERE venta_id = ?',
          [ventaId]
        );
        
        await connection.commit();
        connection.release();
        
        return { success: true, ventaId };
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  async annulTicket(ticketId) {
    try {
      const connection = await this.pool.getConnection();
      
      try {
        // Verificar si el ticket existe y obtener su información con datos de la venta
        const [tickets] = await connection.execute(
          `SELECT t.*, v.cierre_caja_id 
           FROM tickets t
           JOIN ventas v ON t.venta_id = v.id
           WHERE t.id = ?`,
          [ticketId]
        );
        
        if (tickets.length === 0) {
          connection.release();
          throw new Error('El ticket no existe');
        }
        
        const ticket = tickets[0];
        
        // Verificar si el ticket ya está anulado
        if (ticket.anulado === 1) {
          connection.release();
          throw new Error('Este ticket ya está anulado');
        }
        
        // Verificar si el ticket ya fue usado
        if (ticket.usado === 1) {
          connection.release();
          throw new Error('No se puede anular un ticket que ya fue usado');
        }
        
        // Verificar si el ticket está incluido en un cierre de caja
        if (ticket.cierre_caja_id !== null) {
          connection.release();
          throw new Error('No se puede anular un ticket que ya fue incluido en un cierre de caja');
        }
        
        // Anular el ticket
        await connection.execute(
          'UPDATE tickets SET anulado = 1 WHERE id = ?',
          [ticketId]
        );
        
        connection.release();
        
        return { success: true, ticketId };
      } catch (error) {
        connection.release();
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  // ============================================
  // MÉTODOS DE CIERRES DE CAJA
  // ============================================

  async upsertCashClosure({ usuario_id, fecha_inicio, total_ventas, cantidad_tickets, detalle_tipos }) {
    const connection = await this.pool.getConnection();
    
    try {
      // Iniciar transacción
      await connection.beginTransaction();
      
      try {
        // detalle_tipos ya viene como string desde el frontend, no hacer JSON.stringify
        const detalleParaGuardar = typeof detalle_tipos === 'string' ? detalle_tipos : JSON.stringify(detalle_tipos);
        
        // Paso 1: Crear el nuevo cierre (marcado como cerrado por defecto)
        const [result] = await connection.execute(`
          INSERT INTO cierres_caja (usuario_id, fecha_inicio, total_ventas, cantidad_tickets, detalle_tipos, cerrado)
          VALUES (?, ?, ?, ?, ?, 1)
        `, [usuario_id, fecha_inicio, total_ventas, cantidad_tickets, detalleParaGuardar]);
        
        const cierreId = result.insertId;
        
        // Paso 2: Actualizar todas las ventas del día que no tienen cierre asignado
        const [updateResult] = await connection.execute(`
          UPDATE ventas 
          SET cierre_caja_id = ?
          WHERE usuario_id = ? 
            AND DATE(fecha_venta) = DATE(?)
            AND cierre_caja_id IS NULL
            AND anulada = 0
        `, [cierreId, usuario_id, fecha_inicio]);
        
        const ventasActualizadas = updateResult.affectedRows;
        
        // Paso 3: Commit si todo salió bien
        await connection.commit();
        
        return {
          action: 'created',
          id: cierreId,
          ventas_actualizadas: ventasActualizadas
        };
      } catch (error) {
        // Rollback en caso de error
        await connection.rollback();
        throw error;
      }
    } finally {
      // Siempre liberar la conexión
      connection.release();
    }
  }

  async createCashClosure({ usuario_id, fecha_inicio, total_ventas, cantidad_tickets, detalle_tipos }) {
    try {
      const result = await this.query(`
        INSERT INTO cierres_caja (usuario_id, fecha_inicio, total_ventas, cantidad_tickets, detalle_tipos, cerrado)
        VALUES (?, ?, ?, ?, ?, 1)
      `, [usuario_id, fecha_inicio, total_ventas, cantidad_tickets, JSON.stringify(detalle_tipos)]);
      
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  async closeCashClosure(cierreId) {
    try {
      // Obtener información del cierre
      const [cierre] = await this.query(
        'SELECT * FROM cierres_caja WHERE id = ?',
        [cierreId]
      );
      
      if (!cierre) {
        throw new Error('El cierre de caja no existe');
      }
      
      if (cierre.cerrado) {
        throw new Error('Este cierre de caja ya está cerrado');
      }
      
      // Cerrar el cierre
      const fechaCierre = getLocalDateTime();
      await this.query(
        'UPDATE cierres_caja SET cerrado = 1, fecha_cierre = ? WHERE id = ?',
        [fechaCierre, cierreId]
      );
      
      // Asociar ventas al cierre
      await this.query(`
        UPDATE ventas 
        SET cierre_caja_id = ? 
        WHERE usuario_id = ? 
        AND DATE(fecha_venta) = DATE(?)
        AND anulada = 0
        AND cierre_caja_id IS NULL
      `, [cierreId, cierre.usuario_id, cierre.fecha_inicio]);
      
      return { success: true, cierreId };
    } catch (error) {
      throw error;
    }
  }

  async reopenCashClosure(cierreId) {
    try {
      const [cierre] = await this.query(
        'SELECT * FROM cierres_caja WHERE id = ?',
        [cierreId]
      );
      
      if (!cierre) {
        throw new Error('El cierre de caja no existe');
      }
      
      if (!cierre.cerrado) {
        throw new Error('Este cierre de caja ya está abierto');
      }
      
      // Reabrir el cierre
      await this.query(
        'UPDATE cierres_caja SET cerrado = 0 WHERE id = ?',
        [cierreId]
      );
      
      // Desasociar ventas del cierre
      await this.query(
        'UPDATE ventas SET cierre_caja_id = NULL WHERE cierre_caja_id = ?',
        [cierreId]
      );
      
      return { success: true, cierreId };
    } catch (error) {
      throw error;
    }
  }

  async updateCashClosure({ usuario_id, fecha_inicio, total_ventas, cantidad_tickets, detalle_tipos }) {
    try {
      const fechaCierre = getLocalDateTime();
      const result = await this.query(`
        UPDATE cierres_caja 
        SET total_ventas = ?, cantidad_tickets = ?, detalle_tipos = ?, fecha_cierre = ?
        WHERE usuario_id = ? AND DATE(fecha_inicio) = DATE(?)
      `, [total_ventas, cantidad_tickets, JSON.stringify(detalle_tipos), fechaCierre, usuario_id, fecha_inicio]);
      
      return { updated: result.affectedRows };
    } catch (error) {
      throw error;
    }
  }

  async getAllCashClosures() {
    try {
      const rows = await this.query(`
        SELECT cc.*, u.nombre as usuario_nombre, u.usuario as usuario_usuario
        FROM cierres_caja cc
        JOIN usuarios u ON cc.usuario_id = u.id
        ORDER BY cc.fecha_cierre DESC
      `);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  async getCashClosureByDateAndUser(usuario_id, fecha_inicio) {
    try {
      const rows = await this.query(`
        SELECT cc.*, u.nombre as usuario_nombre, u.usuario as usuario_usuario
        FROM cierres_caja cc
        JOIN usuarios u ON cc.usuario_id = u.id
        WHERE cc.usuario_id = ? AND DATE(cc.fecha_inicio) = DATE(?)
        ORDER BY cc.id DESC
        LIMIT 1
      `, [usuario_id, fecha_inicio]);
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw error;
    }
  }

  async getAllCashClosuresByDate(fecha) {
    try {
      const rows = await this.query(`
        SELECT cc.*, u.nombre as usuario_nombre, u.usuario as usuario_usuario
        FROM cierres_caja cc
        JOIN usuarios u ON cc.usuario_id = u.id
        WHERE DATE(cc.fecha_inicio) = DATE(?)
        ORDER BY u.nombre ASC
      `, [fecha]);
      
      // Calcular totales consolidados
      const totalVentas = rows.reduce((sum, row) => sum + parseFloat(row.total_ventas || 0), 0);
      const totalTickets = rows.reduce((sum, row) => sum + parseInt(row.cantidad_tickets || 0), 0);
      
      return {
        fecha: fecha,
        cierres: rows,
        totales: {
          total_ventas: totalVentas,
          cantidad_tickets: totalTickets,
          cantidad_usuarios: rows.length
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // ============================================
  // MÉTODOS DE CONFIGURACIÓN DE RELAY
  // ============================================

  async getConfigRelay() {
    try {
      let [config] = await this.query(
        'SELECT * FROM config_relay WHERE id = 1'
      );
      
      if (!config) {
        // Crear configuración por defecto
        await this.query(
          `INSERT INTO config_relay (id, ip, port, timeout, reintentos) 
           VALUES (1, '192.168.3.200', 80, 3000, 3)`
        );
        
        [config] = await this.query('SELECT * FROM config_relay WHERE id = 1');
      }
      
      return config;
    } catch (error) {
      throw error;
    }
  }

  async updateConfigRelay(data) {
    const { ip, port, timeout, reintentos, modo_rele1 = 'NA', modo_rele2 = 'NA', modo_rele3 = 'NA', modo_rele4 = 'NA' } = data;
    
    try {
      // Validaciones
      if (!ip || !/^(\d{1,3}\.){3}\d{1,3}$/.test(ip.trim())) {
        throw new Error('Formato de IP inválido');
      }
      
      if (!port || port < 1 || port > 65535) {
        throw new Error('El puerto debe estar entre 1 y 65535');
      }
      
      if (!timeout || timeout < 100 || timeout > 30000) {
        throw new Error('El timeout debe estar entre 100 y 30000 ms');
      }
      
      if (!reintentos || reintentos < 1 || reintentos > 10) {
        throw new Error('Los reintentos deben estar entre 1 y 10');
      }
      
      const validModes = ['NA', 'NC'];
      if (!validModes.includes(modo_rele1) || !validModes.includes(modo_rele2) || 
          !validModes.includes(modo_rele3) || !validModes.includes(modo_rele4)) {
        throw new Error('Los modos de relay deben ser NA o NC');
      }
      
      // Obtener datos anteriores
      const [datosAnteriores] = await this.query(
        'SELECT * FROM config_relay WHERE id = 1'
      );
      
      // Actualizar configuración
      await this.query(`
        UPDATE config_relay 
        SET ip = ?, port = ?, timeout = ?, reintentos = ?, 
            modo_rele1 = ?, modo_rele2 = ?, modo_rele3 = ?, modo_rele4 = ?
        WHERE id = 1
      `, [ip.trim(), port, timeout, reintentos, modo_rele1, modo_rele2, modo_rele3, modo_rele4]);
      
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
      
      // Registrar log
      await this.registrarLogConfig({
        accion: 'modificar',
        tabla_afectada: 'config_relay',
        registro_id: 1,
        descripcion: 'Actualización de configuración del relay X-410',
        datos_anteriores: datosAnteriores,
        datos_nuevos: datosNuevos
      }).catch(err => console.error('Error al registrar log:', err));
      
      return datosNuevos;
    } catch (error) {
      throw error;
    }
  }

  async obtenerBotonPorInput(input_numero) {
    try {
      if (!input_numero || input_numero < 1 || input_numero > 4) {
        throw new Error('El número de input debe estar entre 1 y 4');
      }
      
      const [boton] = await this.query(`
        SELECT b.*, t.nombre as tipo_ticket_nombre, t.precio as tipo_ticket_precio
        FROM botones_tickets b
        LEFT JOIN tipos_ticket t ON b.tipo_ticket_id = t.id
        WHERE b.input_numero = ?
      `, [input_numero]);
      
      return boton || null;
    } catch (error) {
      throw error;
    }
  }

  // ============================================
  // MÉTODOS DE LOGS DE CONFIGURACIÓN
  // ============================================

  async registrarLogConfig({ accion, tabla_afectada, registro_id, descripcion, datos_anteriores, datos_nuevos, ip_address, usuario_id, usuario_nombre }) {
    try {
      const accionesValidas = ['crear', 'modificar', 'eliminar'];
      const tablasValidas = ['puertas', 'config_relay', 'tipos_ticket', 'botones_tickets', 'usuarios'];
      
      if (!accionesValidas.includes(accion)) {
        throw new Error(`Acción inválida. Debe ser: ${accionesValidas.join(', ')}`);
      }
      
      if (!tablasValidas.includes(tabla_afectada)) {
        throw new Error(`Tabla inválida. Debe ser: ${tablasValidas.join(', ')}`);
      }
      
      const datosAnterioresStr = datos_anteriores ? JSON.stringify(datos_anteriores) : null;
      const datosNuevosStr = datos_nuevos ? JSON.stringify(datos_nuevos) : null;
      const ipAddr = ip_address || null;
      const usrId = usuario_id || null;
      const usrNombre = usuario_nombre || null;
      
      const result = await this.query(`
        INSERT INTO config_logs (accion, tabla_afectada, registro_id, descripcion, datos_anteriores, datos_nuevos, ip_address, usuario_id, usuario_nombre)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [accion, tabla_afectada, registro_id, descripcion, datosAnterioresStr, datosNuevosStr, ipAddr, usrId, usrNombre]);
      
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  async obtenerLogsConfig({ limit = 100, offset = 0, tabla_afectada, accion, fecha_desde, fecha_hasta } = {}) {
    try {
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
        query += ' AND DATE(fecha_hora) >= DATE(?)';
        params.push(fecha_desde);
      }
      
      if (fecha_hasta) {
        query += ' AND DATE(fecha_hora) <= DATE(?)';
        params.push(fecha_hasta);
      }
      
      // LIMIT y OFFSET deben ser interpolados directamente, no como parámetros preparados
      const safeLimit = parseInt(limit) || 100;
      const safeOffset = parseInt(offset) || 0;
      query += ` ORDER BY fecha_hora DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
      
      const rows = await this.query(query, params);
      
      // Parsear JSON
      const logs = rows.map(row => ({
        ...row,
        datos_anteriores: row.datos_anteriores ? JSON.parse(row.datos_anteriores) : null,
        datos_nuevos: row.datos_nuevos ? JSON.parse(row.datos_nuevos) : null
      }));
      
      return logs;
    } catch (error) {
      throw error;
    }
  }

  async contarLogsConfig({ tabla_afectada, accion, fecha_desde, fecha_hasta } = {}) {
    try {
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
        query += ' AND DATE(fecha_hora) >= DATE(?)';
        params.push(fecha_desde);
      }
      
      if (fecha_hasta) {
        query += ' AND DATE(fecha_hora) <= DATE(?)';
        params.push(fecha_hasta);
      }
      
      const [row] = await this.query(query, params);
      return row.total;
    } catch (error) {
      throw error;
    }
  }

  async obtenerEstadisticasLogs() {
    try {
      const rows = await this.query(`
        SELECT 
          tabla_afectada,
          accion,
          COUNT(*) as cantidad,
          MAX(fecha_hora) as ultima_modificacion
        FROM config_logs
        GROUP BY tabla_afectada, accion
        ORDER BY tabla_afectada, accion
      `);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  async limpiarLogsAntiguos(dias = 90) {
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - dias);
      const fechaLimiteStr = fechaLimite.toISOString().slice(0, 10);
      
      const result = await this.query(
        'DELETE FROM config_logs WHERE DATE(fecha_hora) < DATE(?)',
        [fechaLimiteStr]
      );
      
      return { deleted: result.affectedRows };
    } catch (error) {
      throw error;
    }
  }

  async obtenerHistorialRegistro(tabla, registro_id) {
    try {
      const rows = await this.query(`
        SELECT * FROM config_logs 
        WHERE tabla_afectada = ? AND registro_id = ?
        ORDER BY fecha_hora DESC
      `, [tabla, registro_id]);
      
      // Parsear JSON
      const logs = rows.map(row => ({
        ...row,
        datos_anteriores: row.datos_anteriores ? JSON.parse(row.datos_anteriores) : null,
        datos_nuevos: row.datos_nuevos ? JSON.parse(row.datos_nuevos) : null
      }));
      
      return logs;
    } catch (error) {
      throw error;
    }
  }

  // ============================================
  // MÉTODOS DE UTILIDAD
  // ============================================

  generateUniqueQRCode() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `TICKET-${timestamp}-${random}`;
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('🔌 Database pool closed');
    }
  }
}

// ============================================
// EXPORTAR INSTANCIA ÚNICA (SINGLETON)
// ============================================

let databaseInstance = null;

function getDatabase() {
  if (!databaseInstance) {
    databaseInstance = new Database();
  }
  return databaseInstance;
}

module.exports = getDatabase();
