; ========================================
; Sistema Tickets - Script NSIS para Electron-Builder
; Desarrollado por Telcomexpert S.A.
; ========================================

!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "nsDialogs.nsh"
!include "MUI2.nsh"

; ========================================
; Macro: Inicialización (customInit)
; Se ejecuta al inicio, antes de cualquier cosa.
; ========================================
!macro customInit
  ; Verificar permisos de administrador
  UserInfo::GetAccountType
  Pop $R2
  ${If} $R2 != "Admin"
    MessageBox MB_OK|MB_ICONSTOP "Este instalador requiere permisos de administrador.$\n$\nPor favor, ejecute el instalador como Administrador (clic derecho -> Ejecutar como administrador)."
    Quit
  ${EndIf}
  DetailPrint "Permisos de administrador verificados: $R2"
!macroend

; ========================================
; Variables para la página personalizada
; ========================================
Var Dialog
Var Label
Var LabelTitle
Var RadioServer
Var RadioClient
Var LabelCredentials
Var LabelUser
Var TextUser
Var LabelPass
Var TextPass
Var LabelPassConfirm
Var TextPassConfirm
Var LabelHost
Var TextHost
Var LabelNote
Var InstallType
Var DBUser
Var DBPass
Var DBHost

; ========================================
; Página personalizada de configuración
; ========================================
Page custom ConfigPageCreate ConfigPageLeave

Function ConfigPageCreate
  ; Crear diálogo estándar
  nsDialogs::Create 1018
  Pop $Dialog
  
  ${If} $Dialog == error
    Abort
  ${EndIf}
  
  ; ===== TÍTULO PRINCIPAL =====
  ${NSD_CreateLabel} 0 0 300u 12u "Configuración de Instalación"
  Pop $LabelTitle
  CreateFont $R0 "Segoe UI" 10 700
  SendMessage $LabelTitle ${WM_SETFONT} $R0 0
  
  ; ===== SECCIÓN: TIPO DE INSTALACIÓN =====
  ${NSD_CreateGroupBox} 0 14u 300u 32u "Tipo de instalación"
  Pop $Label
  
  ${NSD_CreateRadioButton} 12u 25u 140u 10u "Servidor Principal (esta PC)"
  Pop $RadioServer
  ${NSD_Check} $RadioServer
  ${NSD_OnClick} $RadioServer OnServerSelected
  
  ${NSD_CreateRadioButton} 155u 25u 140u 10u "Terminal de Venta (Servidor en otra pc)"
  Pop $RadioClient
  ${NSD_OnClick} $RadioClient OnClientSelected
  
  ; ===== SECCIÓN: CREDENCIALES =====
  ${NSD_CreateGroupBox} 0 50u 300u 62u "Credenciales MySQL"
  Pop $Label
  
  ; Subtítulo dinámico
  ${NSD_CreateLabel} 12u 61u 280u 9u "Se instalará MySQL y creará la base de datos:"
  Pop $LabelCredentials
  
  ; Fila 1: Usuario
  ${NSD_CreateLabel} 12u 72u 75u 9u "Usuario:"
  Pop $LabelUser
  ${NSD_CreateText} 90u 70u 198u 12u "admin_tickets"
  Pop $TextUser
  
  ; Fila 2: Contraseña
  ${NSD_CreateLabel} 12u 86u 75u 9u "Contraseña:"
  Pop $LabelPass
  ${NSD_CreatePassword} 90u 84u 198u 12u ""
  Pop $TextPass
  
  ; Fila 3: Confirmar contraseña (solo servidor)
  ${NSD_CreateLabel} 12u 100u 75u 9u "Repetir:"
  Pop $LabelPassConfirm
  ${NSD_CreatePassword} 90u 98u 198u 12u ""
  Pop $TextPassConfirm
  
  ; Fila 3 alternativa: Host/IP (solo cliente, oculto por defecto)
  ${NSD_CreateLabel} 12u 100u 78u 9u "IP Servidor:"
  Pop $LabelHost
  ShowWindow $LabelHost ${SW_HIDE}
  ${NSD_CreateText} 90u 98u 198u 12u ""
  Pop $TextHost
  ShowWindow $TextHost ${SW_HIDE}
  
  ; ===== NOTA INFORMATIVA =====
  ${NSD_CreateLabel} 0 116u 300u 18u "Se configurará esta PC como servidor principal del sistema."
  Pop $LabelNote
  
  nsDialogs::Show
FunctionEnd

; Callback cuando se selecciona SERVIDOR
Function OnServerSelected
  ; Actualizar subtítulo
  ${NSD_SetText} $LabelCredentials "Se instalará MySQL y creará la base de datos:"
  
  ; Ocultar campo Host
  ShowWindow $LabelHost ${SW_HIDE}
  ShowWindow $TextHost ${SW_HIDE}
  
  ; Mostrar campo Confirmar
  ShowWindow $LabelPassConfirm ${SW_SHOW}
  ShowWindow $TextPassConfirm ${SW_SHOW}
  
  ; Limpiar campo Host
  ${NSD_SetText} $TextHost ""
  
  ; Actualizar nota
  ${NSD_SetText} $LabelNote "Se configurará esta PC como servidor principal del sistema."
FunctionEnd

; Callback cuando se selecciona CLIENTE
Function OnClientSelected
  ; Actualizar subtítulo
  ${NSD_SetText} $LabelCredentials "Datos de conexión al servidor principal:"
  
  ; Ocultar campo Confirmar
  ShowWindow $LabelPassConfirm ${SW_HIDE}
  ShowWindow $TextPassConfirm ${SW_HIDE}
  
  ; Mostrar campo Host
  ShowWindow $LabelHost ${SW_SHOW}
  ShowWindow $TextHost ${SW_SHOW}
  
  ; Limpiar campo Confirmar
  ${NSD_SetText} $TextPassConfirm ""
  
  ; Actualizar nota
  ${NSD_SetText} $LabelNote "Ingrese los datos proporcionados por el administrador."
FunctionEnd

Function ConfigPageLeave
  ; Limpiar variables antes de usarlas
  StrCpy $DBUser ""
  StrCpy $DBPass ""
  StrCpy $DBHost ""
  
  ; Obtener el tipo de instalación seleccionado
  ${NSD_GetState} $RadioServer $R0
  
  ${If} $R0 == ${BST_CHECKED}
    ; ==========================================
    ; MODO SERVIDOR
    ; ==========================================
    StrCpy $InstallType "server"
    
    ; Obtener valores de los campos
    ${NSD_GetText} $TextUser $DBUser
    ${NSD_GetText} $TextPass $DBPass
    ${NSD_GetText} $TextPassConfirm $R1
    
    ; Validación 1: Usuario no vacío
    ${If} $DBUser == ""
      MessageBox MB_OK|MB_ICONEXCLAMATION "El nombre de usuario no puede estar vacío."
      Abort
    ${EndIf}
    
    ; Validación 2: Contraseña no vacía
    ${If} $DBPass == ""
      MessageBox MB_OK|MB_ICONEXCLAMATION "La contraseña no puede estar vacía."
      Abort
    ${EndIf}
    
    ; Validación 3: Longitud mínima de contraseña
    StrLen $R2 $DBPass
    ${If} $R2 < 6
      MessageBox MB_OK|MB_ICONEXCLAMATION "La contraseña debe tener al menos 6 caracteres."
      Abort
    ${EndIf}
    
    ; Validación 4: Confirmación de contraseña no vacía
    ${If} $R1 == ""
      MessageBox MB_OK|MB_ICONEXCLAMATION "Debe confirmar la contraseña."
      Abort
    ${EndIf}
    
    ; Validación 5: Las contraseñas deben coincidir
    ${If} $DBPass != $R1
      MessageBox MB_OK|MB_ICONEXCLAMATION "Las contraseñas no coinciden.$\n$\nPor favor, verifique que ambas contraseñas sean idénticas."
      Abort
    ${EndIf}
    
    ; Confirmación final
    MessageBox MB_YESNO|MB_ICONQUESTION "Confirmar credenciales de SERVIDOR:$\n$\nUsuario: $DBUser$\nContraseña: ******$\n$\nEstas credenciales se usarán para CREAR la base de datos MySQL.$\n$\n¿Desea continuar?" IDYES continueServer
      Abort
    
    continueServer:
    ; Host siempre es localhost para servidor
    StrCpy $DBHost "localhost"
    
  ${Else}
    ; ==========================================
    ; MODO CLIENTE
    ; ==========================================
    StrCpy $InstallType "client"
    
    ; Obtener valores de los campos
    ${NSD_GetText} $TextUser $DBUser
    ${NSD_GetText} $TextPass $DBPass
    ${NSD_GetText} $TextHost $DBHost
    
    ; Validación 1: Host no vacío
    ${If} $DBHost == ""
      MessageBox MB_OK|MB_ICONEXCLAMATION "La IP o nombre del servidor no puede estar vacío."
      Abort
    ${EndIf}
    
    ; Validación 2: Host no puede ser localhost en modo cliente
    ${If} $DBHost == "localhost"
    ${OrIf} $DBHost == "127.0.0.1"
      MessageBox MB_YESNO|MB_ICONQUESTION "Está usando 'localhost' o '127.0.0.1' en modo CLIENTE.$\n$\nEsto significa que la aplicación intentará conectarse a un servidor MySQL en ESTA misma PC.$\n$\n¿Es esto correcto?" IDYES continueLocalhost
        Abort
      continueLocalhost:
    ${EndIf}
    
    ; Validación 3: Usuario no vacío
    ${If} $DBUser == ""
      MessageBox MB_OK|MB_ICONEXCLAMATION "El nombre de usuario no puede estar vacío."
      Abort
    ${EndIf}
    
    ; Validación 4: Contraseña no vacía
    ${If} $DBPass == ""
      MessageBox MB_OK|MB_ICONEXCLAMATION "La contraseña no puede estar vacía."
      Abort
    ${EndIf}
    
    ; Validación 5: Longitud mínima de contraseña
    StrLen $R2 $DBPass
    ${If} $R2 < 6
      MessageBox MB_OK|MB_ICONEXCLAMATION "La contraseña debe tener al menos 6 caracteres."
      Abort
    ${EndIf}
    
    ; Confirmación final
    MessageBox MB_YESNO|MB_ICONQUESTION "Confirmar credenciales de CLIENTE:$\n$\nServidor: $DBHost$\nUsuario: $DBUser$\nContraseña: ******$\n$\nEstas credenciales se usarán para CONECTARSE al servidor remoto.$\n$\n¿Desea continuar?" IDYES continueClient
      Abort
      
    continueClient:
  ${EndIf}
FunctionEnd

; ========================================
; Macro: Instalación Personalizada (customInstall)
; Se ejecuta después de copiar los archivos de la app
; ========================================
!macro customInstall
  
  ; Verificar el tipo de instalación seleccionado
  ${If} $InstallType == "server"
    DetailPrint "Configurando instalación de SERVIDOR..."
    DetailPrint "Usuario MySQL: $DBUser"
    
    ; === INSTALACIÓN DE MYSQL ===
    DetailPrint "Iniciando instalacion de MySQL portable..."
    
    ; Ejecutar script de instalación con las credenciales
    nsExec::ExecToLog '"$INSTDIR\resources\scripts\install-mysql.bat" "$INSTDIR\resources\mysql-portable" "$DBUser" "$DBPass"'
    Pop $R1
    
    ${If} $R1 != 0
      MessageBox MB_OK|MB_ICONEXCLAMATION "Hubo un problema durante la instalacion de MySQL.$\n$\nCodigo de error: $R1$\n$\nRevise los logs en:$\n$INSTDIR\resources\scripts\install-mysql.log"
    ${Else}
      DetailPrint "MySQL instalado correctamente"
      MessageBox MB_OK|MB_ICONINFORMATION "MySQL instalado correctamente!$\n$\nUsuario: $DBUser$\nPuerto: 3306$\nBase de datos: tickets_db"
    ${EndIf}
    
    ; Crear archivo de configuración del servidor
    DetailPrint "Creando archivo de configuracion del servidor..."
    FileOpen $R2 "$INSTDIR\config.json" w
    FileWrite $R2 "{$\r$\n"
    FileWrite $R2 '  "mysql": {$\r$\n'
    FileWrite $R2 '    "host": "localhost",$\r$\n'
    FileWrite $R2 '    "port": 3306,$\r$\n'
    FileWrite $R2 '    "user": "'
    FileWrite $R2 "$DBUser"
    FileWrite $R2 '",$\r$\n'
    FileWrite $R2 '    "password": "'
    FileWrite $R2 "$DBPass"
    FileWrite $R2 '",$\r$\n'
    FileWrite $R2 '    "database": "tickets_db"$\r$\n'
    FileWrite $R2 '  },$\r$\n'
    FileWrite $R2 '  "installType": "server",$\r$\n'
    FileWrite $R2 '  "printer": {$\r$\n'
    FileWrite $R2 '    "deviceName": "Bullzip PDF Printer",$\r$\n'
    FileWrite $R2 '    "silent": true,$\r$\n'
    FileWrite $R2 '    "printBackground": true,$\r$\n'
    FileWrite $R2 '    "color": true,$\r$\n'
    FileWrite $R2 '    "margin": {$\r$\n'
    FileWrite $R2 '      "marginType": "none"$\r$\n'
    FileWrite $R2 '    },$\r$\n'
    FileWrite $R2 '    "landscape": false,$\r$\n'
    FileWrite $R2 '    "pagesPerSheet": 1,$\r$\n'
    FileWrite $R2 '    "collate": false,$\r$\n'
    FileWrite $R2 '    "copies": 1,$\r$\n'
    FileWrite $R2 '    "pageSize": "Custom",$\r$\n'
    FileWrite $R2 '    "customHeight": 120,$\r$\n'
    FileWrite $R2 '    "customWidth": 80$\r$\n'
    FileWrite $R2 '  }$\r$\n'
    FileWrite $R2 "}$\r$\n"
    FileClose $R2
    
    ; === INSTALACIÓN DEL SERVICIO DE CONTROL DE ACCESO ===
    DetailPrint "Instalando servicio de Control de Acceso QR..."
    
    ; Copiar el ejecutable al directorio principal
    CopyFiles /SILENT "$INSTDIR\resources\control-acceso\control-acceso-qr.exe" "$INSTDIR\control-acceso-qr.exe"
    
    ; Crear carpeta de logs si no existe
    CreateDirectory "$INSTDIR\logs"
    
    ; Registrar como servicio de Windows
    DetailPrint "Registrando servicio ControlAccesoQR..."
    nsExec::ExecToLog 'sc create ControlAccesoQR binPath= "$INSTDIR\control-acceso-qr.exe" start= auto DisplayName= "Control de Acceso QR - TCS"'
    Pop $R3
    
    ; Configurar descripción del servicio
    nsExec::ExecToLog 'sc description ControlAccesoQR "Servicio de control de acceso mediante lectores QR y reles X-410. Sistema Tickets - Telcomexpert S.A."'
    
    ; Configurar recuperación automática (reiniciar si falla)
    nsExec::ExecToLog 'sc failure ControlAccesoQR reset= 86400 actions= restart/5000/restart/10000/restart/30000'
    
    ; Iniciar el servicio
    DetailPrint "Iniciando servicio ControlAccesoQR..."
    nsExec::ExecToLog 'sc start ControlAccesoQR'
    Pop $R4
    
    ${If} $R4 == 0
      DetailPrint "Servicio de Control de Acceso iniciado correctamente"
    ${Else}
      DetailPrint "Nota: El servicio se iniciara cuando se configure el sistema"
    ${EndIf}
    
    MessageBox MB_OK|MB_ICONINFORMATION "Instalacion en modo SERVIDOR completada.$\n$\nMySQL: Instalado y configurado$\nControl de Acceso: Servicio instalado$\n$\nEl servicio de Control de Acceso se ejecutara automaticamente."
    
  ${Else}
    DetailPrint "Configurando instalación de CLIENTE..."
    DetailPrint "Servidor: $DBHost"
    DetailPrint "Usuario: $DBUser"
    
    ; Crear archivo de configuración del cliente con las credenciales ingresadas
    DetailPrint "Creando archivo de configuracion del cliente..."
    FileOpen $R2 "$INSTDIR\config.json" w
    FileWrite $R2 "{$\r$\n"
    FileWrite $R2 '  "mysql": {$\r$\n'
    FileWrite $R2 '    "host": "'
    FileWrite $R2 "$DBHost"
    FileWrite $R2 '",$\r$\n'
    FileWrite $R2 '    "port": 3306,$\r$\n'
    FileWrite $R2 '    "user": "'
    FileWrite $R2 "$DBUser"
    FileWrite $R2 '",$\r$\n'
    FileWrite $R2 '    "password": "'
    FileWrite $R2 "$DBPass"
    FileWrite $R2 '",$\r$\n'
    FileWrite $R2 '    "database": "tickets_db"$\r$\n'
    FileWrite $R2 '  },$\r$\n'
    FileWrite $R2 '  "installType": "client",$\r$\n'
    FileWrite $R2 '  "printer": {$\r$\n'
    FileWrite $R2 '    "deviceName": "Bullzip PDF Printer",$\r$\n'
    FileWrite $R2 '    "silent": true,$\r$\n'
    FileWrite $R2 '    "printBackground": true,$\r$\n'
    FileWrite $R2 '    "color": true,$\r$\n'
    FileWrite $R2 '    "margin": {$\r$\n'
    FileWrite $R2 '      "marginType": "none"$\r$\n'
    FileWrite $R2 '    },$\r$\n'
    FileWrite $R2 '    "landscape": false,$\r$\n'
    FileWrite $R2 '    "pagesPerSheet": 1,$\r$\n'
    FileWrite $R2 '    "collate": false,$\r$\n'
    FileWrite $R2 '    "copies": 1,$\r$\n'
    FileWrite $R2 '    "pageSize": "Custom",$\r$\n'
    FileWrite $R2 '    "customHeight": 120,$\r$\n'
    FileWrite $R2 '    "customWidth": 80$\r$\n'
    FileWrite $R2 '  }$\r$\n'
    FileWrite $R2 "}$\r$\n"
    FileClose $R2
    
    MessageBox MB_OK|MB_ICONINFORMATION "Instalacion en modo CLIENTE completada.$\n$\nServidor: $DBHost$\nUsuario: $DBUser$\nBase de datos: tickets_db"
  ${EndIf}
  
  ; Crear acceso directo en el escritorio
  DetailPrint "Creando acceso directo en el escritorio..."
  CreateShortcut "$DESKTOP\Sistema Tickets.lnk" "$INSTDIR\Sistema Tickets.exe"
  DetailPrint "Instalacion finalizada."

!macroend

; ========================================
; Macro: Desinstalación (customUnInstall)
; ========================================
!macro customUnInstall
  DetailPrint "Desinstalando Sistema Tickets..."

  ; 1. Detener y Borrar Servicio de Control de Acceso (si existe)
  IfFileExists "$INSTDIR\control-acceso-qr.exe" 0 NoControlAccesoInstalled
    DetailPrint "Deteniendo servicio de Control de Acceso..."
    nsExec::ExecToLog 'sc stop ControlAccesoQR'
    Sleep 2000
    DetailPrint "Eliminando servicio de Control de Acceso..."
    nsExec::ExecToLog 'sc delete ControlAccesoQR'
    Sleep 1000
    Delete "$INSTDIR\control-acceso-qr.exe"
  NoControlAccesoInstalled:

  ; 2. Detener y Borrar Servicio MySQL (si existe)
  IfFileExists "$INSTDIR\resources\mysql-portable\mysql-8.0.44-winx64\bin\mysqld.exe" 0 NoMySQLInstalled
    DetailPrint "Deteniendo servicio MySQL..."
    nsExec::ExecToLog 'net stop MySQLTickets'
    nsExec::ExecToLog 'sc delete MySQLTickets'
    
    ; Dar un momento para liberar archivos
    Sleep 2000 
    DetailPrint "Eliminando archivos de MySQL..."
    RMDir /r "$INSTDIR\resources\mysql-portable"
  NoMySQLInstalled:

  ; 3. Borrar Acceso Directo
  DetailPrint "Eliminando acceso directo..."
  Delete "$DESKTOP\Sistema Tickets.lnk"

  ; 4. Preguntar si borrar datos
  MessageBox MB_YESNO|MB_ICONQUESTION "¿Desea borrar tambien la configuracion, logs y base de datos local?" IDNO KeepData
    DetailPrint "Eliminando datos de usuario..."
    Delete "$INSTDIR\config.json"
    Delete "$INSTDIR\database.sqlite"
    RMDir /r "$INSTDIR\data"
    RMDir /r "$INSTDIR\logs"
    DetailPrint "Datos eliminados."
    Goto UninstallDone

  KeepData:
    DetailPrint "Datos conservados."

  UninstallDone:
    DetailPrint "Desinstalacion completada."
!macroend