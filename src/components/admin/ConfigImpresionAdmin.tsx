import React, { useState, useEffect } from 'react';
import { showSuccess, showError, showConfirm } from '../../utils/dialogs';

interface Printer {
  name: string;
  displayName: string;
  description: string;
  status: number;
  isDefault: boolean;
}

interface PrinterConfig {
  deviceName: string;
  silent: boolean;
  printBackground: boolean;
  color: boolean;
  margin: {
    marginType: string;
  };
  landscape: boolean;
  pagesPerSheet: number;
  collate: boolean;
  copies: number;
  pageSize: string;
  customWidth?: number;  // Ancho personalizado en mm
  customHeight?: number; // Alto personalizado en mm
}

const ConfigImpresionAdmin: React.FC = () => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [config, setConfig] = useState<PrinterConfig>({
    deviceName: '',
    silent: true,
    printBackground: true,
    color: false,
    margin: {
      marginType: 'default'
    },
    landscape: false,
    pagesPerSheet: 1,
    collate: false,
    copies: 1,
    pageSize: 'A4',
    customWidth: 80,
    customHeight: 200
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingPrinters, setLoadingPrinters] = useState(false);

  useEffect(() => {
    loadPrinters();
    loadConfig();
  }, []);

  const loadPrinters = async () => {
    setLoadingPrinters(true);
    try {
      const response = await window.electronAPI.getPrinters();
      if (response.success && response.printers) {
        setPrinters(response.printers);
      } else {
        await showError(response.error || 'Error al cargar impresoras');
      }
    } catch (error: any) {
      await showError(error.message || 'Error al cargar impresoras');
    } finally {
      setLoadingPrinters(false);
    }
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await window.electronAPI.getPrinterConfig();
      if (response.success && response.config) {
        setConfig(response.config);
      }
    } catch (error: any) {
      console.error('Error al cargar configuración:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.deviceName) {
      await showError('Debe seleccionar una impresora');
      return;
    }

    const confirmed = await showConfirm(
      '¿Está seguro de guardar esta configuración de impresión?\n\nLa impresión automática se aplicará inmediatamente.',
      'Confirmar Configuración'
    );

    if (!confirmed) return;

    setSaving(true);
    try {
      console.log('💾 Frontend - Guardando configuración:', config);
      const response = await window.electronAPI.savePrinterConfig(config);
      console.log('💾 Frontend - Respuesta:', response);
      if (response.success) {
        await showSuccess('Configuración de impresión guardada correctamente.\n\nLos tickets ahora se imprimirán automáticamente.');
      } else {
        await showError(response.error || 'Error al guardar configuración');
      }
    } catch (error: any) {
      console.error('❌ Frontend - Error al guardar:', error);
      await showError(error.message || 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrint = async () => {
    if (!config.deviceName) {
      await showError('Debe seleccionar una impresora primero');
      return;
    }

    const confirmed = await showConfirm(
      `¿Desea imprimir un ticket de prueba en "${config.deviceName}"?`,
      'Prueba de Impresión'
    );

    if (!confirmed) return;

    // Generar código QR de prueba (formato similar al real)
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const qrCodePrueba = `PRUEBA-${timestamp}-${random}`;
    
    // Crear un QR code simplificado como SVG (patrón de cuadrícula simple)
    // Esto evita problemas de serialización con la librería qrcode
    const qrCodeSVG = `
      <svg width="150" height="150" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150">
        <rect fill="white" width="150" height="150"/>
        <rect fill="black" x="10" y="10" width="10" height="10"/>
        <rect fill="black" x="30" y="10" width="10" height="10"/>
        <rect fill="black" x="50" y="10" width="10" height="10"/>
        <rect fill="black" x="70" y="10" width="10" height="10"/>
        <rect fill="black" x="90" y="10" width="10" height="10"/>
        <rect fill="black" x="110" y="10" width="10" height="10"/>
        <rect fill="black" x="130" y="10" width="10" height="10"/>
        
        <rect fill="black" x="10" y="30" width="10" height="10"/>
        <rect fill="black" x="130" y="30" width="10" height="10"/>
        
        <rect fill="black" x="10" y="50" width="10" height="10"/>
        <rect fill="black" x="30" y="50" width="10" height="10"/>
        <rect fill="black" x="50" y="50" width="10" height="10"/>
        <rect fill="black" x="90" y="50" width="10" height="10"/>
        <rect fill="black" x="110" y="50" width="10" height="10"/>
        <rect fill="black" x="130" y="50" width="10" height="10"/>
        
        <rect fill="black" x="10" y="70" width="10" height="10"/>
        <rect fill="black" x="30" y="70" width="10" height="10"/>
        <rect fill="black" x="50" y="70" width="10" height="10"/>
        <rect fill="black" x="70" y="70" width="10" height="10"/>
        <rect fill="black" x="90" y="70" width="10" height="10"/>
        <rect fill="black" x="110" y="70" width="10" height="10"/>
        <rect fill="black" x="130" y="70" width="10" height="10"/>
        
        <rect fill="black" x="10" y="90" width="10" height="10"/>
        <rect fill="black" x="50" y="90" width="10" height="10"/>
        <rect fill="black" x="90" y="90" width="10" height="10"/>
        <rect fill="black" x="130" y="90" width="10" height="10"/>
        
        <rect fill="black" x="10" y="110" width="10" height="10"/>
        <rect fill="black" x="30" y="110" width="10" height="10"/>
        <rect fill="black" x="50" y="110" width="10" height="10"/>
        <rect fill="black" x="70" y="110" width="10" height="10"/>
        <rect fill="black" x="90" y="110" width="10" height="10"/>
        <rect fill="black" x="110" y="110" width="10" height="10"/>
        <rect fill="black" x="130" y="110" width="10" height="10"/>
        
        <rect fill="black" x="10" y="130" width="10" height="10"/>
        <rect fill="black" x="30" y="130" width="10" height="10"/>
        <rect fill="black" x="50" y="130" width="10" height="10"/>
        <rect fill="black" x="70" y="130" width="10" height="10"/>
        <rect fill="black" x="90" y="130" width="10" height="10"/>
        <rect fill="black" x="110" y="130" width="10" height="10"/>
        <rect fill="black" x="130" y="130" width="10" height="10"/>
        
        <text x="75" y="148" text-anchor="middle" fill="black" font-size="6" font-family="monospace">PRUEBA</text>
      </svg>
    `;
    
    // Generar HTML del ticket de prueba (idéntico al ticket real)
    const ticketHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Ticket de Prueba</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          @page {
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
          }
          body {
            font-family: Arial, sans-serif;
            background: white;
            color: black;
          }
          .ticket {
            text-align: center;
            padding: 10mm 5mm;
            background: white;
            color: black;
            width: 100%;
          }
          .ticket-header {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            color: black;
          }
          .qr-code {
            margin: 10px auto;
            padding: 5px;
            background: white;
            width: fit-content;
          }
          .qr-code svg {
            width: 150px;
            height: 150px;
            display: block;
          }
          .ticket-info {
            margin: 10px 0;
            font-size: 14px;
            line-height: 1.5;
            color: black;
          }
          .ticket-info p {
            margin: 3px 0;
            color: black;
          }
          .ticket-footer {
            margin-top: 10px;
            padding-top: 5px;
            font-size: 12px;
            color: black;
            border-top: 1px dashed #ccc;
          }
          .ticket-footer p {
            margin: 3px 0;
          }
          @media print {
            @page {
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="ticket-header">
            Ticket de Entrada
          </div>
          <div class="qr-code">
            ${qrCodeSVG}
          </div>
          <div class="ticket-info">
            <p><strong>TICKET DE PRUEBA</strong></p>
            <p style="font-weight: bold;">Puertas: General, Garage</p>
            <p>Fecha: ${new Date().toLocaleString('es-EC')}</p>
            <p>Precio: $0.44</p>
          </div>
          <div class="ticket-footer">
            <p>Conserve este ticket para su ingreso</p>
            <p>Válido para un solo uso</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const result = await window.electronAPI.printTicket(ticketHTML);
      if (result.success) {
        await showSuccess('Ticket de prueba enviado a la impresora correctamente');
      } else {
        await showError('La impresión de prueba fue cancelada o falló');
      }
    } catch (error: any) {
      console.error('Error en handleTestPrint:', error);
      await showError(error.message || 'Error al imprimir ticket de prueba');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1D324D]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1D324D] to-[#457373] rounded-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <div>
            <h2 className="text-2xl font-bold">Configuración de Impresión</h2>
            <p className="text-white/80 text-sm mt-1">Configure la impresora para tickets automáticos</p>
          </div>
        </div>
      </div>

      {/* Información */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">ℹ️ Impresión Automática</p>
            <p>Cuando active "Impresión Silenciosa", los tickets se enviarán directamente a la impresora seleccionada sin mostrar el diálogo de impresión.</p>
            <p className="mt-1">Si desactiva esta opción, se mostrará una ventana de vista previa con un botón para imprimir manualmente.</p>
          </div>
        </div>
      </div>

      {/* Formulario de configuración */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          {/* Selección de impresora */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Impresora
            </label>
            <div className="flex gap-2">
              <select
                value={config.deviceName}
                onChange={(e) => setConfig({ ...config, deviceName: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#457373] focus:border-transparent"
                disabled={loadingPrinters}
              >
                <option value="">Seleccione una impresora...</option>
                {printers.map((printer) => (
                  <option key={printer.name} value={printer.name}>
                    {printer.displayName || printer.name} {printer.isDefault ? '(Predeterminada)' : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={loadPrinters}
                disabled={loadingPrinters}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                title="Actualizar lista de impresoras"
              >
                {loadingPrinters ? (
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Opciones de impresión */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Impresión silenciosa */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Impresión Silenciosa</p>
                <p className="text-sm text-gray-500">Sin diálogo de impresión</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.silent}
                  onChange={(e) => setConfig({ ...config, silent: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#457373]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#457373]"></div>
              </label>
            </div>

            {/* Impresión a color */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Impresión a Color</p>
                <p className="text-sm text-gray-500">Usar color si está disponible</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.color}
                  onChange={(e) => setConfig({ ...config, color: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#457373]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#457373]"></div>
              </label>
            </div>

            {/* Orientación */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Orientación Horizontal</p>
                <p className="text-sm text-gray-500">Girar 90° (landscape)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.landscape}
                  onChange={(e) => setConfig({ ...config, landscape: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#457373]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#457373]"></div>
              </label>
            </div>
          </div>

          {/* Tamaño de papel y copias */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tamaño de Papel
              </label>
              <select
                value={config.pageSize}
                onChange={(e) => setConfig({ ...config, pageSize: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#457373] focus:border-transparent"
              >
                <optgroup label="📄 Tamaños Estándar">
                  <option value="A4">A4 (210 x 297 mm)</option>
                  <option value="Letter">Carta (216 x 279 mm)</option>
                  <option value="Legal">Legal (216 x 356 mm)</option>
                  <option value="A5">A5 (148 x 210 mm)</option>
                  <option value="A6">A6 (105 x 148 mm)</option>
                </optgroup>
                <optgroup label="🎫 Impresoras Térmicas (Rollos)">
                  <option value="80mm">80mm Ancho (80 x 297 mm) - Común</option>
                  <option value="58mm">58mm Ancho (58 x 210 mm) - Compacto</option>
                  <option value="Custom57x105">57 x 105 mm (Ticket pequeño)</option>
                  <option value="Custom80x150">80 x 150 mm (Ticket mediano)</option>
                  <option value="Custom80x200">80 x 200 mm (Ticket grande)</option>
                  <option value="Custom80x80">80 x 80 mm (Cuadrado)</option>
                </optgroup>
                <optgroup label="🏷️ Etiquetas">
                  <option value="Custom100x150">100 x 150 mm (Etiqueta grande)</option>
                  <option value="Custom100x100">100 x 100 mm (Etiqueta cuadrada)</option>
                  <option value="Custom50x30">50 x 30 mm (Etiqueta pequeña)</option>
                </optgroup>
                <optgroup label="✏️ Personalizado">
                  <option value="Custom">Tamaño Personalizado</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Copias
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.copies}
                onChange={(e) => setConfig({ ...config, copies: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#457373] focus:border-transparent"
              />
            </div>
          </div>

          {/* Dimensiones personalizadas (solo si se selecciona Custom) */}
          {config.pageSize === 'Custom' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span className="text-sm font-medium text-blue-800">Dimensiones Personalizadas (en milímetros)</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">
                    Ancho (mm)
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="500"
                    value={config.customWidth || 80}
                    onChange={(e) => setConfig({ ...config, customWidth: parseInt(e.target.value) || 80 })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="80"
                  />
                  <p className="text-xs text-blue-600 mt-1">Recomendado: 50-100mm</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">
                    Alto (mm)
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="1000"
                    value={config.customHeight || 200}
                    onChange={(e) => setConfig({ ...config, customHeight: parseInt(e.target.value) || 200 })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="200"
                  />
                  <p className="text-xs text-blue-600 mt-1">Recomendado: 100-300mm</p>
                </div>
              </div>
              <div className="mt-3 text-xs text-blue-700 bg-blue-100 p-2 rounded">
                📏 Vista previa: <strong>{config.customWidth || 80}mm × {config.customHeight || 200}mm</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3">
        <button
          onClick={handleTestPrint}
          disabled={!config.deviceName || saving}
          className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Imprimir Prueba
        </button>
        <button
          onClick={handleSave}
          disabled={!config.deviceName || saving}
          className="flex-1 bg-[#1D324D] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#457373] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>Guardar Configuración</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ConfigImpresionAdmin;
