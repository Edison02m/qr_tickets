/// <reference types="react-scripts" />

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

declare global {
  interface Window {
    electronAPI?: {
      getActiveTicketTypes: () => Promise<TicketType[]>;
      createSale: (ticketId: number, precio: number) => Promise<TicketVenta>;
      printTicket: (html: string) => Promise<boolean>;
      notificarImpresionCompletada: () => void;
    };
    ticketsImpresos?: boolean;
  }
}