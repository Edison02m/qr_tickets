@echo off
REM ========================================
REM Script de Instalacion de MySQL Portable
REM Sistema de Tickets - VERSION CORREGIDA
REM ========================================

REM Solicitar permisos de administrador si no los tiene
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo ERROR: Se requierenREM ========================================
REM Resumen final
REM ========================================

echo.
echo =========================================
echo   MySQL instalado correctamente
echo =========================================
echo.
echo CREDENCIALES DE ACCESO:
echo =========================================
echo Servidor: localhost
echo Puerto: !MYSQL_PORT!
echo Usuario: %DB_USER%
echo Contraseña: %DB_PASS%
echo Base de datos: tickets_db
echo =========================================
echo.
echo Servicio de Windows: MySQLTickets
echo.
echo IMPORTANTE: Guarde estas credenciales
echo en un lugar seguro!
echo =========================================
echo.
echo ========================================= >> "%LOGFILE%"
echo   Instalacion completada exitosamente! >> "%LOGFILE%"
echo ========================================= >> "%LOGFILE%"
echo Usuario: %DB_USER% >> "%LOGFILE%"
echo Puerto: !MYSQL_PORT! >> "%LOGFILE%"
echo Base de datos: tickets_db >> "%LOGFILE%"
echo ========================================= >> "%LOGFILE%"nistrador
    echo ========================================
    echo.
    echo Pasos para solucionar:
    echo 1. Cierre esta ventana
    echo 2. Click derecho en el instalador
    echo 3. Seleccione "Ejecutar como administrador"
    echo.
    echo ========================================
    pause
    exit /b 1
)

setlocal enabledelayedexpansion

REM === CONFIGURACION DE LOGGING ===
set LOGFILE=%~dp0install-mysql.log
echo ==== INICIO INSTALACION MYSQL ==== > "%LOGFILE%"
echo Fecha: %DATE% %TIME% >> "%LOGFILE%"
echo Directorio recibido: %~1 >> "%LOGFILE%"
echo. >> "%LOGFILE%"

REM === VARIABLES ===
set MYSQL_PARENT=%~1
set DB_USER=%~2
set DB_PASS=%~3
set MYSQL_ZIP=%MYSQL_PARENT%\mysql-8.0.44-winx64.zip
set MYSQL_DIR=%MYSQL_PARENT%\mysql-8.0.44-winx64
set MYSQL_DATA=%MYSQL_DIR%\data
set MYSQL_BIN=%MYSQL_DIR%\bin
set MYSQL_PORT=3306

REM Validar que se pasaron las credenciales
if "%DB_USER%"=="" (
    set DB_USER=admin_tickets
    echo ADVERTENCIA: No se proporciono usuario, usando: %DB_USER%
    echo ADVERTENCIA: No se proporciono usuario, usando: %DB_USER% >> "%LOGFILE%"
)

if "%DB_PASS%"=="" (
    echo ERROR: No se proporciono contraseña
    echo ERROR: No se proporciono contraseña >> "%LOGFILE%"
    pause
    exit /b 1
)

echo =========================================
echo   Instalacion de MySQL Portable
echo =========================================
echo.
echo Directorio recibido: %MYSQL_PARENT%
echo.
echo ========================================= >> "%LOGFILE%"
echo   Instalacion de MySQL Portable >> "%LOGFILE%"
echo ========================================= >> "%LOGFILE%"
echo Directorio recibido: %MYSQL_PARENT% >> "%LOGFILE%"
echo. >> "%LOGFILE%"

REM Verificar que se paso el directorio
if "%MYSQL_PARENT%"=="" (
    echo ERROR: No se especifico el directorio de MySQL
    echo ERROR: No se especifico el directorio de MySQL >> "%LOGFILE%"
    pause
    exit /b 1
)

REM ========================================
REM PASO 0: Descomprimir MySQL ZIP
REM ========================================

echo [0/7] Verificando archivo ZIP...
echo [0/7] Verificando archivo ZIP... >> "%LOGFILE%"

if not exist "%MYSQL_ZIP%" (
    echo ERROR: No se encontro el archivo ZIP de MySQL
    echo Buscando en: %MYSQL_ZIP%
    echo ERROR: No se encontro el archivo ZIP de MySQL >> "%LOGFILE%"
    echo Buscando en: %MYSQL_ZIP% >> "%LOGFILE%"
    pause
    exit /b 1
)

if not exist "%MYSQL_DIR%" (
    echo [0/7] Descomprimiendo MySQL portable...
    echo Esto puede tardar 1-2 minutos, por favor espere...
    echo.
    echo [0/7] Descomprimiendo MySQL portable... >> "%LOGFILE%"
    
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%MYSQL_ZIP%' -DestinationPath '%MYSQL_PARENT%' -Force" >> "%LOGFILE%" 2>&1
    
    if !errorlevel! neq 0 (
        echo ERROR: Fallo la descompresion de MySQL
        echo ERROR: Fallo la descompresion de MySQL >> "%LOGFILE%"
        pause
        exit /b 1
    )
    echo MySQL descomprimido correctamente
    echo MySQL descomprimido correctamente >> "%LOGFILE%"
) else (
    echo MySQL ya esta descomprimido, continuando...
    echo MySQL ya esta descomprimido, continuando... >> "%LOGFILE%"
)

REM Verificar que existe mysqld.exe
if not exist "%MYSQL_BIN%\mysqld.exe" (
    echo ERROR: No se encontro mysqld.exe en %MYSQL_BIN%
    echo La descompresion puede haber fallado
    echo ERROR: No se encontro mysqld.exe en %MYSQL_BIN% >> "%LOGFILE%"
    pause
    exit /b 1
)

echo Buscando MySQL en: %MYSQL_DIR%
echo Buscando MySQL en: %MYSQL_DIR% >> "%LOGFILE%"
echo.
echo. >> "%LOGFILE%"

REM ========================================
REM Detectar si el puerto 3306 esta en uso
REM ========================================

echo Verificando disponibilidad del puerto 3306...
echo Verificando disponibilidad del puerto 3306... >> "%LOGFILE%"

netstat -ano | findstr ":3306" > nul
if !errorlevel! equ 0 (
    echo ADVERTENCIA: Puerto 3306 ya esta en uso
    echo Se utilizara el puerto 3307 para evitar conflictos
    echo ADVERTENCIA: Puerto 3306 ya esta en uso >> "%LOGFILE%"
    echo Se utilizara el puerto 3307 para evitar conflictos >> "%LOGFILE%"
    set MYSQL_PORT=3307
    timeout /t 3 /nobreak > nul
) else (
    echo Puerto 3306 disponible
    echo Puerto 3306 disponible >> "%LOGFILE%"
    set MYSQL_PORT=3306
)

echo Puerto seleccionado: !MYSQL_PORT!
echo Puerto seleccionado: !MYSQL_PORT! >> "%LOGFILE%"
echo.
echo. >> "%LOGFILE%"

REM ========================================
REM PASO 1: Crear directorio de datos
REM ========================================

echo [1/7] Creando directorio de datos...
echo [1/7] Creando directorio de datos... >> "%LOGFILE%"

REM Eliminar directorio de datos si existe (por si hay residuos)
if exist "%MYSQL_DATA%" (
    echo Limpiando directorio de datos existente...
    echo Limpiando directorio de datos existente... >> "%LOGFILE%"
    rmdir /s /q "%MYSQL_DATA%" 2>> "%LOGFILE%"
)

REM Crear directorio de datos con permisos completos
mkdir "%MYSQL_DATA%" 2>> "%LOGFILE%"
if !errorlevel! neq 0 (
    echo ERROR: No se pudo crear el directorio de datos
    echo ERROR: No se pudo crear el directorio de datos >> "%LOGFILE%"
    pause
    exit /b 1
)

REM Otorgar permisos completos al directorio (usando SID en lugar de nombre de cuenta)
REM S-1-1-0 = Everyone (funciona en cualquier idioma de Windows)
icacls "%MYSQL_DATA%" /grant *S-1-1-0:(OI)(CI)F /T >> "%LOGFILE%" 2>&1
icacls "%MYSQL_DIR%" /grant *S-1-1-0:(OI)(CI)F /T >> "%LOGFILE%" 2>&1

echo Directorio de datos creado: %MYSQL_DATA%
echo Directorio de datos creado: %MYSQL_DATA% >> "%LOGFILE%"

REM ========================================
REM PASO 2: Crear archivo my.ini
REM ========================================

echo [2/7] Creando archivo de configuracion my.ini...
echo [2/7] Creando archivo de configuracion my.ini... >> "%LOGFILE%"

REM Convertir rutas de Windows a formato MySQL (forward slashes)
set MYSQL_DIR_UNIX=%MYSQL_DIR:\=/%
set MYSQL_DATA_UNIX=%MYSQL_DATA:\=/%

(
echo [mysqld]
echo port=!MYSQL_PORT!
echo bind-address=0.0.0.0
echo basedir=%MYSQL_DIR_UNIX%
echo datadir=%MYSQL_DATA_UNIX%
echo lc-messages-dir=%MYSQL_DIR_UNIX%/share
echo lc-messages=en_US
echo max_connections=100
echo character-set-server=utf8mb4
echo collation-server=utf8mb4_unicode_ci
echo default-storage-engine=INNODB
echo [client]
echo port=!MYSQL_PORT!
echo default-character-set=utf8mb4
) > "%MYSQL_DIR%\my.ini"

echo Archivo my.ini creado correctamente
echo Archivo my.ini creado correctamente >> "%LOGFILE%"

REM ========================================
REM PASO 3: Inicializar base de datos
REM ========================================

echo [3/7] Inicializando base de datos...
echo [3/7] Inicializando base de datos... >> "%LOGFILE%"

cd /d "%MYSQL_BIN%"
mysqld --defaults-file="%MYSQL_DIR%\my.ini" --initialize-insecure --console >> "%LOGFILE%" 2>&1

if !errorlevel! neq 0 (
    echo ERROR: Fallo la inicializacion de MySQL
    echo ERROR: Fallo la inicializacion de MySQL >> "%LOGFILE%"
    echo Revise el log: %LOGFILE%
    pause
    exit /b 1
)

REM ========================================
REM PASO 4: Instalar servicio
REM ========================================

echo [4/7] Instalando servicio de Windows...
echo [4/7] Instalando servicio de Windows... >> "%LOGFILE%"

REM Eliminar servicio previo si existe
sc query MySQLTickets > nul 2>&1
if !errorlevel! equ 0 (
    echo Eliminando servicio existente...
    echo Eliminando servicio existente... >> "%LOGFILE%"
    net stop MySQLTickets > nul 2>&1
    sc delete MySQLTickets > nul 2>&1
    timeout /t 2 /nobreak > nul
)

mysqld --install MySQLTickets --defaults-file="%MYSQL_DIR%\my.ini" >> "%LOGFILE%" 2>&1

if !errorlevel! neq 0 (
    echo ERROR: Fallo la instalacion del servicio
    echo Puede requerir permisos de administrador
    echo ERROR: Fallo la instalacion del servicio >> "%LOGFILE%"
    echo Revise el log: %LOGFILE%
    pause
    exit /b 1
)

REM ========================================
REM PASO 5: Iniciar servicio
REM ========================================

echo [5/7] Iniciando servicio MySQL...
echo [5/7] Iniciando servicio MySQL... >> "%LOGFILE%"

net start MySQLTickets >> "%LOGFILE%" 2>&1

if !errorlevel! neq 0 (
    echo ERROR: No se pudo iniciar el servicio
    echo ERROR: No se pudo iniciar el servicio >> "%LOGFILE%"
    echo Revise el log: %LOGFILE%
    pause
    exit /b 1
)

REM Esperar a que MySQL este listo
echo Esperando a que MySQL este listo...
echo Esperando a que MySQL este listo... >> "%LOGFILE%"
timeout /t 5 /nobreak > nul

REM ========================================
REM PASO 6: Crear base de datos
REM ========================================

echo [6/7] Creando base de datos y usuario...
echo [6/7] Creando base de datos y usuario... >> "%LOGFILE%"

REM Crear script SQL temporal con las credenciales personalizadas
set TEMP_SQL=%~dp0temp-init.sql

(
echo -- Crear base de datos
echo CREATE DATABASE IF NOT EXISTS tickets_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
echo.
echo -- Crear usuario personalizado
echo CREATE USER IF NOT EXISTS '%DB_USER%'@'localhost' IDENTIFIED BY '%DB_PASS%';
echo CREATE USER IF NOT EXISTS '%DB_USER%'@'%%' IDENTIFIED BY '%DB_PASS%';
echo.
echo -- Otorgar permisos
echo GRANT ALL PRIVILEGES ON tickets_db.* TO '%DB_USER%'@'localhost';
echo GRANT ALL PRIVILEGES ON tickets_db.* TO '%DB_USER%'@'%%';
echo FLUSH PRIVILEGES;
echo.
echo -- Usar la base de datos
echo USE tickets_db;
echo.
) > "%TEMP_SQL%"

REM Agregar el contenido del init-db.sql (sin las primeras líneas de creación de usuario)
if exist "%~dp0init-db.sql" (
    REM Leer init-db.sql saltando las primeras 22 líneas (creación de DB y usuario)
    more +22 "%~dp0init-db.sql" >> "%TEMP_SQL%"
)

REM Ejecutar el script SQL completo
"%MYSQL_BIN%\mysql.exe" -u root --port=!MYSQL_PORT! < "%TEMP_SQL%" >> "%LOGFILE%" 2>&1

if !errorlevel! neq 0 (
    echo ADVERTENCIA: Hubo un problema al crear la base de datos
    echo ADVERTENCIA: Hubo un problema al crear la base de datos >> "%LOGFILE%"
    echo Puede crearla manualmente despues
    del "%TEMP_SQL%" 2>nul
) else (
    echo Base de datos creada correctamente
    echo Base de datos creada correctamente >> "%LOGFILE%"
    echo Usuario: %DB_USER%
    echo Usuario: %DB_USER% >> "%LOGFILE%"
    del "%TEMP_SQL%" 2>nul
)

REM ========================================
REM PASO 7: Configurar firewall
REM ========================================

echo [7/7] Configurando firewall...
echo [7/7] Configurando firewall... >> "%LOGFILE%"

netsh advfirewall firewall delete rule name="MySQL Sistema Tickets" > nul 2>&1
netsh advfirewall firewall add rule name="MySQL Sistema Tickets" dir=in action=allow protocol=TCP localport=!MYSQL_PORT! >> "%LOGFILE%" 2>&1

if !errorlevel! neq 0 (
    echo ADVERTENCIA: No se pudo configurar el firewall
    echo ADVERTENCIA: No se pudo configurar el firewall >> "%LOGFILE%"
    echo Debe abrir el puerto !MYSQL_PORT! manualmente
) else (
    echo Firewall configurado correctamente
    echo Firewall configurado correctamente >> "%LOGFILE%"
)

REM ========================================
REM Crear config.json
REM ========================================

echo.
echo Creando archivo de configuracion config.json...
echo Creando archivo de configuracion config.json... >> "%LOGFILE%"

set CONFIG_FILE=%MYSQL_PARENT%\..\..\config.json

(
echo {
echo   "database": {
echo     "host": "localhost",
echo     "port": !MYSQL_PORT!,
echo     "user": "%DB_USER%",
echo     "password": "%DB_PASS%",
echo     "database": "tickets_db"
echo   },
echo   "installType": "server"
echo }
) > "%CONFIG_FILE%"

echo Configuracion guardada en: %CONFIG_FILE%
echo Configuracion guardada en: %CONFIG_FILE% >> "%LOGFILE%"

REM ========================================
REM Resumen final
REM ========================================

echo.
echo =========================================
echo   MySQL instalado correctamente
echo =========================================
echo Servicio: MySQLTickets
echo Puerto: !MYSQL_PORT!
echo Usuario: tickets_user
echo Base de datos: tickets_db
echo =========================================
echo.
echo ========================================= >> "%LOGFILE%"
echo   Instalacion completada exitosamente! >> "%LOGFILE%"
echo ========================================= >> "%LOGFILE%"
echo Servicio: MySQLTickets >> "%LOGFILE%"
echo Puerto: !MYSQL_PORT! >> "%LOGFILE%"
echo Usuario: tickets_user >> "%LOGFILE%"
echo Base de datos: tickets_db >> "%LOGFILE%"
echo ========================================= >> "%LOGFILE%"

echo Revise el log para detalles: %LOGFILE%

endlocal
exit /b 0