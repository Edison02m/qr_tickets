import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import * as ReactDOMServer from 'react-dom/server';

interface TicketType {
  id: number;
  nombre: string;
  precio: number;
  activo: boolean;
}

interface TicketVenta {
  ventaId: number;
  qrCode: string;
  ticketTypeId: number;
  precio: number;
  fecha: string;
}

interface SelectedTicketCount {
  ticket: TicketType;
  cantidad: number;
}

const NuevaVenta: React.FC = () => {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<SelectedTicketCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{show: boolean; message: string}>({
    show: false,
    message: ''
  });

  // Calcular el total de la venta
  const totalVenta = selectedTickets.reduce((total, item) => {
    return total + (item.ticket.precio * item.cantidad);
  }, 0);

  useEffect(() => {
    loadActiveTicketTypes();
  }, []);

  const loadActiveTicketTypes = async () => {
    try {
      if (window.electronAPI) {
        const types = await window.electronAPI.getActiveTicketTypes();
        setTicketTypes(types);
      }
    } catch (error) {
      console.error('Error loading ticket types:', error);
      setError('Error al cargar los tipos de tickets');
    }
  };

  const handleTicketQuantityChange = (ticket: TicketType, cantidad: number) => {
    setSelectedTickets(prev => {
      // Si la cantidad es 0, removemos el ticket
      if (cantidad === 0) {
        return prev.filter(item => item.ticket.id !== ticket.id);
      }

      // Si el ticket ya existe, actualizamos su cantidad
      const existingIndex = prev.findIndex(item => item.ticket.id === ticket.id);
      if (existingIndex >= 0) {
        const newSelectedTickets = [...prev];
        newSelectedTickets[existingIndex] = { ticket, cantidad };
        return newSelectedTickets;
      }

      // Si el ticket no existe, lo agregamos
      return [...prev, { ticket, cantidad }];
    });
  };


  // Generar el código QR en el formato solicitado
  const generarCodigoQR = (tipoTicketNombre: string) => {
    // Limpiar el nombre del tipo de ticket para el código
    const tipo = tipoTicketNombre.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const random1 = Math.random().toString(36).substring(2, 10);
    const random2 = Math.random().toString(36).substring(2, 8);
    return `ticket-${tipo}-${random1}-${random2}`;
  };

  // Generar el QR code SVG para impresión
  const generarQRCodeSVG = (qrCode: string) => {
    return ReactDOMServer.renderToString(
      <QRCodeSVG
        value={qrCode}
        size={200}
        level="H"
      />
    );
  };

  const generarTicketHTML = (ticketVenta: TicketVenta) => {
    const ticketType = ticketTypes.find(t => t.id === ticketVenta.ticketTypeId);
    const qrCodeHTML = generarQRCodeSVG(ticketVenta.qrCode);
    return `
      <div class="ticket">
        <div class="ticket-header">
          Ticket de Entrada
        </div>
        <div class="qr-code">
          ${qrCodeHTML}
        </div>
        <div class="ticket-info">
          <p><strong>${ticketType?.nombre || ''}</strong></p>
          <p>Fecha: ${new Date(ticketVenta.fecha).toLocaleString()}</p>
          <p>Precio: $${ticketVenta.precio.toFixed(2)}</p>
          <p style="font-size: 12px; word-break: break-all;">${ticketVenta.qrCode}</p>
        </div>
        <div class="ticket-footer">
          <p>Conserve este ticket para su ingreso</p>
          <p>Válido para un solo uso</p>
        </div>
      </div>
    `;
  };

  const generarDocumentoTickets = (tickets: TicketVenta[]) => {
    const ticketsHTML = tickets.map(ticket => generarTicketHTML(ticket)).join('');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Tickets de Entrada</title>
        <style>
          @page {
            size: 80mm 200mm;
            margin: 0;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            width: 80mm;
          }
          .ticket {
            text-align: center;
            padding: 20px;
            border-bottom: 1px dashed #ccc;
            break-inside: avoid;
            page-break-after: always;
          }
          .ticket:last-child {
            border-bottom: none;
          }
          .ticket-header {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
          }
          .qr-code {
            margin: 15px auto;
            padding: 10px;
            background: white;
            width: fit-content;
          }
          .qr-code svg {
            width: 150px;
            height: 150px;
          }
          .ticket-info {
            margin: 15px 0;
            font-size: 14px;
            line-height: 1.5;
          }
          .ticket-info p {
            margin: 5px 0;
          }
          .ticket-footer {
            margin-top: 15px;
            padding-top: 10px;
            font-size: 12px;
            color: #666;
          }
          @media print {
            body {
              width: 100%;
              padding: 0;
            }
            .ticket {
              page-break-after: always;
            }
            .ticket:last-child {
              page-break-after: avoid;
            }
          }
        </style>
      </head>
      <body>
        ${ticketsHTML}
      </body>
      </html>
    `;
  };

  const procesarEImprimirVenta = async () => {
    if (selectedTickets.length === 0) return;

    setLoading(true);
    setError('');

    try {
      if (!window.electronAPI) {
        throw new Error('Sistema no disponible');
      }

      const totalTickets = selectedTickets.reduce((sum, item) => sum + item.cantidad, 0);
      let ticketsVendidos: TicketVenta[] = [];

      // Actualizar notificación inicial
      setNotification({
        show: true,
        message: 'Procesando venta...'
      });


      // Procesar cada ticket seleccionado
      for (const selectedTicket of selectedTickets) {
        // Validar datos del ticket
        if (!selectedTicket.ticket.id || !selectedTicket.ticket.precio) {
          throw new Error(`Datos inválidos para el ticket ${selectedTicket.ticket.nombre}`);
        }

        // Procesar la cantidad solicitada de cada tipo
        for (let i = 0; i < selectedTicket.cantidad; i++) {
          try {
            // Generar el código QR en el frontend
            const qrCode = generarCodigoQR(selectedTicket.ticket.nombre);

            // Crear la venta en la base de datos, enviando el código QR generado
            const result = await window.electronAPI.createSale(
              selectedTicket.ticket.id,
              selectedTicket.ticket.precio,
              qrCode // Nuevo argumento: código QR generado en el frontend
            );

            // Usar el código QR generado en el frontend para impresión y registro
            if (!result || !result.ventaId) {
              throw new Error('Error en la respuesta del servidor');
            }

            ticketsVendidos.push({
              ...result,
              qrCode // Aseguramos que el código QR usado sea el generado aquí
            });

            // Actualizar la notificación con el progreso
            setNotification({
              show: true,
              message: `Generando tickets: ${ticketsVendidos.length}/${totalTickets}`
            });

          } catch (error) {
            console.error('Error al procesar ticket:', error);
            setError(`Error al procesar ticket ${selectedTicket.ticket.nombre}. Por favor, intente nuevamente.`);
            return;
          }
        }
      }

      // Generar el documento HTML con todos los tickets
      if (ticketsVendidos.length > 0) {
        try {
          const documentoCompleto = generarDocumentoTickets(ticketsVendidos);
          
          // Agregar script para confirmar cierre de ventana
          const documentoConScript = documentoCompleto.replace('</body>',
            `<script>
              window.onbeforeunload = function(e) {
                if (!window.ticketsImpresos) {
                  e.preventDefault();
                  e.returnValue = '¿Está seguro que desea cerrar? Si cierra sin imprimir, necesitará procesar la venta nuevamente.';
                  return e.returnValue;
                }
              };
              
              window.addEventListener('afterprint', function() {
                window.ticketsImpresos = true;
                // Notificar al proceso principal que se imprimieron los tickets
                if (window.electronAPI) {
                  window.electronAPI.notificarImpresionCompletada();
                }
              });
            </script>
            </body>`
          );
          
          // Imprimir todos los tickets de una vez
          const impresionExitosa = await window.electronAPI.printTicket(documentoConScript);

          if (impresionExitosa) {
            // Mostrar notificación de éxito
            setNotification({
              show: true,
              message: `Venta completada: ${ticketsVendidos.length} tickets generados e impresos`
            });

            // Limpiar selección después de imprimir
            setSelectedTickets([]);
          } else {
            setError('La impresión fue cancelada. Por favor, procese la venta nuevamente para imprimir los tickets.');
          }
        } catch (error) {
          console.error('Error al imprimir tickets:', error);
          setError('Error al imprimir los tickets. Los tickets fueron generados pero necesitan reimprimirse.');
        }
      }

      // Ocultar la notificación después de 3 segundos
      setTimeout(() => {
        setNotification({ show: false, message: '' });
      }, 3000);

    } catch (error: any) {
      console.error('Error en la venta:', error);
      setError(error.message || 'Error al procesar la venta');
    } finally {
      setLoading(false);
    }
  };

  const handleVenta = async () => {
    if (selectedTickets.length === 0) return;

    // Crear mensaje de confirmación detallado
    const mensajeConfirmacion = `¿Confirmar venta de:\n${selectedTickets
      .map(item => `- ${item.cantidad} ${item.ticket.nombre} ($${(item.ticket.precio * item.cantidad).toFixed(2)})`)
      .join('\n')}\n\nTotal: $${totalVenta.toFixed(2)}`;

    // Mostrar confirmación
    const confirmar = window.confirm(mensajeConfirmacion);

    if (confirmar) {
      await procesarEImprimirVenta();
    }
  };

  return (
    <div className="w-full h-full p-6 space-y-6">
      {/* Notificación tipo toast */}
      {notification.show && (
        <div 
          className="fixed top-4 right-4 bg-gradient-to-r from-[#457373] to-[#1D324D] text-white px-6 py-3 rounded-2xl shadow-2xl transition-all duration-300 flex items-center text-sm z-50"
        >
          <svg 
            className="w-5 h-5 mr-3" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path d="M5 13l4 4L19 7"></path>
          </svg>
          {notification.message}
        </div>
      )}

      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 p-6 w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 min-h-[500px]">
        {/* Columna izquierda: selección de tickets */}
        <div className="flex-1 lg:border-r border-[#DFE4E4]/50 pr-0 lg:pr-6 pb-6 lg:pb-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-0.5 bg-[#457373] rounded-full"></div>
            <h2 className="text-lg font-light text-[#1D324D] tracking-tight">
              Nueva Venta de Tickets
            </h2>
            <div className="w-6 h-0.5 bg-[#457373] rounded-full"></div>
          </div>
          <p className="text-[#7C4935]/70 text-xs font-light mb-4">
            Selecciona la cantidad de tickets que deseas vender:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {ticketTypes.map((ticket) => {
              const selectedCount = selectedTickets.find(t => t.ticket.id === ticket.id)?.cantidad || 0;
              return (
                <div
                  key={ticket.id}
                  className={`group relative overflow-hidden backdrop-blur-sm rounded-xl p-4 border transition-all duration-300 hover:shadow-lg hover:scale-[1.01] ${
                    selectedCount > 0
                      ? 'bg-gradient-to-br from-[#457373]/10 to-[#1D324D]/10 border-[#457373]/30 shadow-md'
                      : 'bg-white/50 border-[#DFE4E4]/50 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-[#1D324D] text-base mb-0.5">{ticket.nombre}</h3>
                      <p className="text-xs text-[#7C4935]/70">
                        ${ticket.precio.toFixed(2)} c/u
                      </p>
                    </div>
                    {selectedCount > 0 && (
                      <div className="w-5 h-5 bg-gradient-to-r from-[#457373] to-[#1D324D] rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleTicketQuantityChange(ticket, Math.max(0, selectedCount - 1))}
                        disabled={loading || selectedCount === 0}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/70 border border-[#DFE4E4] text-[#1D324D] hover:bg-[#F1EADC]/50 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <svg className="w-4 h-4" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="w-8 text-center font-bold text-lg text-[#1D324D]">
                        {selectedCount}
                      </span>
                      <button
                        onClick={() => handleTicketQuantityChange(ticket, selectedCount + 1)}
                        disabled={loading}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-r from-[#457373] to-[#1D324D] text-white hover:from-[#1D324D] hover:to-[#457373] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
                      >
                        <svg className="w-4 h-4" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    </div>
                    
                    {selectedCount > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-[#7C4935]/70">Subtotal</p>
                        <p className="font-bold text-sm text-[#457373]">
                          ${(ticket.precio * selectedCount).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna derecha: totales y confirmación */}
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col pl-0 lg:pl-6">
          {error && (
            <div className="mb-4 p-3 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-400 rounded-r-xl">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            </div>
          )}
          
          <div className="flex-1 flex flex-col">
            {totalVenta === 0 ? (
              <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-[#F1EADC]/20 to-[#DFE4E4]/20 rounded-xl border border-[#DFE4E4]/30 py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-[#7C4935]/20 to-[#457373]/20 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-[#7C4935]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-[#1D324D] mb-1">Selecciona Tickets</h3>
                <p className="text-xs text-[#7C4935]/70 text-center leading-relaxed">
                  Elige los tickets para procesar una venta
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-[#F1EADC]/20 via-white to-[#DFE4E4]/20 backdrop-blur-sm rounded-xl p-4 border border-[#DFE4E4]/50 shadow-lg">
                {/* Header del resumen */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-4 h-0.5 bg-[#457373] rounded-full"></div>
                  <h4 className="text-base font-medium text-[#1D324D]">Resumen</h4>
                  <div className="w-4 h-0.5 bg-[#457373] rounded-full"></div>
                </div>
                
                {/* Lista de tickets seleccionados */}
                <div className="mb-4">
                  <ul className="space-y-2">
                    {selectedTickets.map(({ ticket, cantidad }) => (
                      <li key={ticket.id} className="flex justify-between items-center p-2 bg-white/50 rounded-lg border border-[#DFE4E4]/30">
                        <div>
                          <span className="text-xs font-medium text-[#1D324D]">{cantidad} × {ticket.nombre}</span>
                          <p className="text-xs text-[#7C4935]/70">${ticket.precio.toFixed(2)} c/u</p>
                        </div>
                        <span className="font-semibold text-sm text-[#457373]">${(ticket.precio * cantidad).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Total */}
                <div className="border-t border-[#DFE4E4]/30 pt-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-medium text-[#1D324D]">Total:</span>
                    <span className="text-xl font-bold text-[#1D324D]">${totalVenta.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Botón de confirmar venta */}
                <button
                  onClick={handleVenta}
                  disabled={loading || totalVenta === 0}
                  className="w-full bg-gradient-to-r from-[#1D324D] to-[#457373] text-white py-3 px-4 rounded-xl hover:from-[#457373] hover:to-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.01] shadow-lg font-medium text-sm"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Procesando...
                    </div>
                  ) : (
                    'Confirmar Venta'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR placeholder oculto para la impresión */}
      <div className="hidden">
        <div id="ticket-qr-placeholder">
          <QRCodeSVG
            value="placeholder"
            size={200}
            level="H"
          />
        </div>
      </div>
    </div>
  );
};

export default NuevaVenta;