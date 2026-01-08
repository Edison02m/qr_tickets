-- ========================================
-- Script de Inicializacion de Base de Datos
-- Sistema de Tickets
-- ========================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS tickets_db 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Crear usuario
CREATE USER IF NOT EXISTS 'tickets_user'@'localhost' IDENTIFIED BY 'Tickets2024MySQL';
CREATE USER IF NOT EXISTS 'tickets_user'@'%' IDENTIFIED BY 'Tickets2024MySQL';

-- Otorgar permisos
GRANT ALL PRIVILEGES ON tickets_db.* TO 'tickets_user'@'localhost';
GRANT ALL PRIVILEGES ON tickets_db.* TO 'tickets_user'@'%';

FLUSH PRIVILEGES;

-- Usar la base de datos
USE tickets_db;

-- ========================================
-- Tabla: usuarios (SIN DEPENDENCIAS)
-- ========================================
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL,
  activo TINYINT(1) DEFAULT 1,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_rol CHECK (rol IN ('vendedor','admin'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Tabla: puertas (SIN DEPENDENCIAS)
-- ========================================
CREATE TABLE IF NOT EXISTS puertas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  descripcion TEXT,
  lector_ip VARCHAR(15) NULL,
  lector_port INT DEFAULT 5000,
  relay_number INT NULL,
  tiempo_apertura_segundos INT DEFAULT 5,
  activo TINYINT(1) DEFAULT 1,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_relay_number CHECK (relay_number BETWEEN 1 AND 4),
  CONSTRAINT chk_tiempo_apertura CHECK (tiempo_apertura_segundos BETWEEN 1 AND 60)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Tabla: cierres_caja (depende de: usuarios)
-- ========================================
CREATE TABLE IF NOT EXISTS cierres_caja (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  fecha_inicio DATETIME NOT NULL,
  fecha_cierre DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_ventas DECIMAL(10,2) NOT NULL,
  cantidad_tickets INT NOT NULL,
  detalle_tipos TEXT,
  cerrado TINYINT(1) DEFAULT 0,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_fecha (fecha_inicio),
  INDEX idx_usuario (usuario_id),
  INDEX idx_cerrado (cerrado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Tabla: tipos_ticket (depende de: puertas)
-- ========================================
CREATE TABLE IF NOT EXISTS tipos_ticket (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  precio DECIMAL(10,2) NOT NULL,
  puerta_id INT NULL,
  activo TINYINT(1) DEFAULT 1,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (puerta_id) REFERENCES puertas(id),
  CONSTRAINT chk_precio_positivo CHECK (precio > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Tabla: ventas (depende de: usuarios, cierres_caja)
-- ========================================
CREATE TABLE IF NOT EXISTS ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  fecha_venta DATETIME DEFAULT CURRENT_TIMESTAMP,
  anulada TINYINT(1) DEFAULT 0,
  cierre_caja_id INT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (cierre_caja_id) REFERENCES cierres_caja(id),
  INDEX idx_fecha (fecha_venta),
  INDEX idx_usuario (usuario_id),
  INDEX idx_anulada (anulada),
  INDEX idx_cierre (cierre_caja_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Tabla: tickets (depende de: ventas, tipos_ticket)
-- ========================================
CREATE TABLE IF NOT EXISTS tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venta_id INT NOT NULL,
  tipo_ticket_id INT NOT NULL,
  codigo_qr VARCHAR(150) NOT NULL UNIQUE,
  puerta_codigo VARCHAR(20) NULL,
  precio DECIMAL(10,2) NOT NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  anulado TINYINT(1) DEFAULT 0,
  usado TINYINT(1) DEFAULT 0,
  fecha_uso DATETIME NULL,
  impreso TINYINT(1) DEFAULT 0,
  fecha_impresion DATETIME NULL,
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
  FOREIGN KEY (tipo_ticket_id) REFERENCES tipos_ticket(id),
  INDEX idx_codigo (codigo_qr),
  INDEX idx_venta (venta_id),
  INDEX idx_usado (usado),
  INDEX idx_anulado (anulado),
  INDEX idx_puerta_codigo (puerta_codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Tabla: tipos_ticket_puertas (depende de: tipos_ticket, puertas)
-- ========================================
CREATE TABLE IF NOT EXISTS tipos_ticket_puertas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo_ticket_id INT NOT NULL,
  puerta_id INT NOT NULL,
  UNIQUE KEY unique_tipo_puerta (tipo_ticket_id, puerta_id),
  FOREIGN KEY (tipo_ticket_id) REFERENCES tipos_ticket(id) ON DELETE CASCADE,
  FOREIGN KEY (puerta_id) REFERENCES puertas(id) ON DELETE CASCADE,
  INDEX idx_tipo_ticket (tipo_ticket_id),
  INDEX idx_puerta (puerta_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Tabla: botones_tickets (depende de: tipos_ticket)
-- ========================================
CREATE TABLE IF NOT EXISTS botones_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  input_numero INT NOT NULL,
  tipo_ticket_id INT NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  descripcion TEXT,
  activo TINYINT(1) DEFAULT 1,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_input (input_numero),
  FOREIGN KEY (tipo_ticket_id) REFERENCES tipos_ticket(id),
  CONSTRAINT chk_input_range CHECK (input_numero BETWEEN 1 AND 4),
  CONSTRAINT chk_cantidad_positiva CHECK (cantidad > 0),
  INDEX idx_input (input_numero),
  INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Tabla: config_logs (depende de: usuarios)
-- ========================================
CREATE TABLE IF NOT EXISTS config_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  accion VARCHAR(20) NOT NULL,
  tabla_afectada VARCHAR(50) NOT NULL,
  registro_id INT NULL,
  descripcion TEXT,
  datos_anteriores TEXT,
  datos_nuevos TEXT,
  fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  usuario_id INT NULL,
  usuario_nombre VARCHAR(100) NULL,
  CONSTRAINT chk_accion CHECK (accion IN ('crear','modificar','eliminar')),
  CONSTRAINT chk_tabla_afectada CHECK (tabla_afectada IN ('puertas','config_relay','tipos_ticket','botones_tickets','usuarios')),
  INDEX idx_fecha (fecha_hora),
  INDEX idx_tabla (tabla_afectada),
  INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Tabla: config_relay (SIN DEPENDENCIAS)
-- ========================================
CREATE TABLE IF NOT EXISTS config_relay (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip VARCHAR(15) NOT NULL DEFAULT '192.168.3.200',
  port INT NOT NULL DEFAULT 80,
  timeout INT NOT NULL DEFAULT 3000,
  reintentos INT NOT NULL DEFAULT 3,
  modo_rele1 VARCHAR(2) DEFAULT 'NA',
  modo_rele2 VARCHAR(2) DEFAULT 'NA',
  modo_rele3 VARCHAR(2) DEFAULT 'NA',
  modo_rele4 VARCHAR(2) DEFAULT 'NA',
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_modo_rele1 CHECK (modo_rele1 IN ('NA', 'NC')),
  CONSTRAINT chk_modo_rele2 CHECK (modo_rele2 IN ('NA', 'NC')),
  CONSTRAINT chk_modo_rele3 CHECK (modo_rele3 IN ('NA', 'NC')),
  CONSTRAINT chk_modo_rele4 CHECK (modo_rele4 IN ('NA', 'NC'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Datos Iniciales: Usuario Administrador
-- ========================================
-- Usuario: admin
-- Contraseña: admin123
INSERT INTO usuarios (nombre, usuario, password, rol, activo) 
VALUES ('Administrador', 'admin', '$2b$10$NVpOTDe6eiGfsQNjRAWn0eqGpVpR8azjdG9x6knuQ5CP3YSVpZnvW', 'admin', 1)
ON DUPLICATE KEY UPDATE usuario=usuario;

-- ========================================
-- Migración: Agregar columnas nuevas a config_logs (para bases existentes)
-- ========================================
-- Estas sentencias solo se ejecutan si las columnas no existen

-- Procedimiento para agregar columnas si no existen
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS agregar_columnas_config_logs()
BEGIN
    -- Verificar y agregar usuario_id
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'config_logs' 
        AND COLUMN_NAME = 'usuario_id'
    ) THEN
        ALTER TABLE config_logs ADD COLUMN usuario_id INT NULL;
        ALTER TABLE config_logs ADD INDEX idx_usuario (usuario_id);
    END IF;
    
    -- Verificar y agregar usuario_nombre
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'config_logs' 
        AND COLUMN_NAME = 'usuario_nombre'
    ) THEN
        ALTER TABLE config_logs ADD COLUMN usuario_nombre VARCHAR(100) NULL;
    END IF;
END //
DELIMITER ;

-- Ejecutar el procedimiento
CALL agregar_columnas_config_logs();

-- Eliminar el procedimiento temporal
DROP PROCEDURE IF EXISTS agregar_columnas_config_logs;

-- Finalizado
SELECT 'Base de datos inicializada correctamente' AS mensaje;
