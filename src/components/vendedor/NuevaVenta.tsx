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

  // Generar el QR code para un ticket específico
  const generarQRCode = (qrCode: string) => {
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
    const qrCodeHTML = generarQRCode(ticketVenta.qrCode);
    
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
    // No se agrega ningún mensaje de éxito ni advertencia en la ventana de impresión
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
            // Crear la venta en la base de datos
            const result = await window.electronAPI.createSale(
              selectedTicket.ticket.id,
              selectedTicket.ticket.precio
            );

            if (!result || !result.ventaId || !result.qrCode) {
              throw new Error('Error en la respuesta del servidor');
            }

            ticketsVendidos.push(result);

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
    <div className="grid grid-cols-1 gap-6 p-6 relative">
      {/* Notificación tipo toast */}
      {notification.show && (
        <div 
          className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 flex items-center"
          style={{ zIndex: 1000 }}
        >
          <svg 
            className="w-5 h-5 mr-2" 
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

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Nueva Venta de Ticket
        </h2>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-700">
            Seleccione los tickets:
          </h3>
          <div className="grid gap-4">
            {ticketTypes.map((ticket) => {
              const selectedCount = selectedTickets.find(t => t.ticket.id === ticket.id)?.cantidad || 0;
              return (
                <div
                  key={ticket.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    selectedCount > 0
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{ticket.nombre}</span>
                      <p className="text-sm text-gray-600">
                        ${ticket.precio.toFixed(2)} c/u
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleTicketQuantityChange(ticket, Math.max(0, selectedCount - 1))}
                        disabled={loading || selectedCount === 0}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-semibold">
                        {selectedCount}
                      </span>
                      <button
                        onClick={() => handleTicketQuantityChange(ticket, selectedCount + 1)}
                        disabled={loading}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {selectedCount > 0 && (
                    <div className="mt-2 text-right text-sm text-gray-600">
                      Subtotal: ${(ticket.precio * selectedCount).toFixed(2)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalVenta > 0 && (
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-medium">Total:</span>
                <span className="text-2xl font-bold">${totalVenta.toFixed(2)}</span>
              </div>
              <button
                onClick={handleVenta}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
              >
                {loading ? 'Procesando...' : 'Confirmar Venta'}
              </button>
            </div>
          )}
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