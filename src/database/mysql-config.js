/**
 * Configuración de conexión a MySQL
 * Este archivo maneja la configuración del pool de conexiones a MySQL
 */

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// Configuración por defecto (desarrollo local)
const DEFAULT_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'tickets_user',
  password: 'tickets2026',
  database: 'tickets_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: '-05:00'  // Zona horaria de Ecuador (UTC-5)
};

let pool = null;

/**
 * Cargar configuración desde archivo config.json (si existe)
 * @returns {Object} Configuración de MySQL
 */
function loadConfig() {
  try {
    // Intentar leer config.json desde el directorio de la aplicación
    const configPath = path.join(process.cwd(), 'config.json');
    
    if (fs.existsSync(configPath)) {
      const configFile = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configFile);
      
      if (config.mysql) {
        console.log('📁 Configuración MySQL cargada desde config.json');
        return {
          ...DEFAULT_CONFIG,
          ...config.mysql
        };
      }
    }
  } catch (error) {
    console.warn('⚠️ No se pudo cargar config.json, usando configuración por defecto:', error.message);
  }
  
  console.log('🔧 Usando configuración MySQL por defecto (localhost)');
  return DEFAULT_CONFIG;
}

/**
 * Obtener o crear el pool de conexiones
 * @returns {mysql.Pool} Pool de conexiones MySQL
 */
function getPool() {
  if (!pool) {
    const config = loadConfig();
    pool = mysql.createPool(config);
    
    // Configurar zona horaria para todas las conexiones
    pool.on('connection', (connection) => {
      connection.query("SET time_zone = '-05:00'", (error) => {
        if (error) {
          console.error('❌ Error configurando zona horaria:', error);
        }
      });
    });
    
    console.log(`✅ Pool de conexiones MySQL creado: ${config.user}@${config.host}:${config.port}/${config.database}`);
    console.log(`🌍 Zona horaria configurada: UTC-5 (Ecuador)`);
  }
  return pool;
}

/**
 * Probar la conexión a MySQL
 * @param {Object} customConfig - Configuración personalizada (opcional)
 * @returns {Promise<Object>} Resultado de la prueba de conexión
 */
async function testConnection(customConfig = null) {
  let testPool = null;
  
  try {
    // Usar configuración personalizada o la del pool existente
    const config = customConfig ? {
      ...DEFAULT_CONFIG,
      host: customConfig.host,
      port: customConfig.port,
      user: customConfig.user,
      password: customConfig.password,
      database: customConfig.database
    } : loadConfig();
    
    // Crear pool temporal para la prueba
    testPool = mysql.createPool(config);
    
    // Intentar conexión
    const connection = await testPool.getConnection();
    await connection.ping();
    
    // Obtener información de la base de datos
    const [rows] = await connection.query('SHOW TABLES');
    const tableCount = rows.length;
    
    connection.release();
    
    console.log(`✅ Conexión a MySQL exitosa (${config.database}, ${tableCount} tablas)`);
    
    return {
      success: true,
      database: config.database,
      tables: tableCount
    };
  } catch (error) {
    console.error('❌ Error al conectar a MySQL:', error.message);
    return {
      success: false,
      error: error.code === 'ECONNREFUSED' 
        ? 'No se puede conectar al servidor MySQL. Verifica que esté corriendo.'
        : error.code === 'ER_ACCESS_DENIED_ERROR'
        ? 'Usuario o contraseña incorrectos'
        : error.code === 'ER_BAD_DB_ERROR'
        ? 'La base de datos no existe'
        : error.message
    };
  } finally {
    // Cerrar pool temporal
    if (testPool && customConfig) {
      await testPool.end();
    }
  }
}

/**
 * Cerrar el pool de conexiones
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔌 Pool de conexiones MySQL cerrado');
  }
}

/**
 * Guardar configuración en config.json
 * @param {Object} mysqlConfig - Configuración MySQL a guardar
 */
function saveConfig(mysqlConfig) {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    let config = {};
    
    // Leer config existente si existe
    if (fs.existsSync(configPath)) {
      const configFile = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(configFile);
    }
    
    // Actualizar solo la sección mysql
    config.mysql = {
      host: mysqlConfig.host || DEFAULT_CONFIG.host,
      port: mysqlConfig.port || DEFAULT_CONFIG.port,
      user: mysqlConfig.user || DEFAULT_CONFIG.user,
      password: mysqlConfig.password || DEFAULT_CONFIG.password,
      database: mysqlConfig.database || DEFAULT_CONFIG.database
    };
    
    // Guardar archivo
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('💾 Configuración MySQL guardada en config.json');
    
    // Recrear pool con nueva configuración
    if (pool) {
      pool.end();
      pool = null;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error al guardar configuración:', error.message);
    return false;
  }
}

module.exports = {
  getPool,
  testConnection,
  closePool,
  loadConfig,
  saveConfig,
  DEFAULT_CONFIG
};
