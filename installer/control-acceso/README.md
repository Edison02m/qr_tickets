# Control de Acceso QR - Componente de Servidor

Este ejecutable maneja el control de acceso mediante lectores QR y relés X-410.

## Archivos

- `control-acceso-qr.exe` - Ejecutable principal del servicio
- Los logs se guardan en `C:\Program Files\Sistema Tickets\logs\`

## Configuración

El ejecutable usa el mismo `config.json` que la aplicación principal:
`C:\Program Files\Sistema Tickets\config.json`

### Campos requeridos en config.json:

```json
{
  "mysql": {
    "host": "localhost",
    "port": 3306,
    "user": "admin_tickets",
    "password": "...",
    "database": "tickets_db"
  },
  "x410_relay": {
    "ip": "192.168.3.200",
    "port": 80
  }
}
```

## Instalación como Servicio

El instalador NSIS registra automáticamente este ejecutable como servicio de Windows
con el nombre `ControlAccesoQR`.

### Comandos manuales:

```batch
# Instalar servicio
sc create ControlAccesoQR binPath= "C:\Program Files\Sistema Tickets\control-acceso-qr.exe" start= auto

# Iniciar servicio
sc start ControlAccesoQR

# Detener servicio
sc stop ControlAccesoQR

# Eliminar servicio
sc delete ControlAccesoQR
```

## API REST

El servicio expone una API en el puerto 3002:

- `GET /api/health` - Estado del servicio
- `GET /api/status` - Estado detallado
- `POST /api/config/reload` - Recargar configuración

## Logs

Los logs se guardan en:
- `C:\Program Files\Sistema Tickets\logs\accesos.log` - Todos los accesos
- `C:\Program Files\Sistema Tickets\logs\errores.log` - Solo errores
