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
      // Ticket / sales
      getActiveTicketTypes: () => Promise<TicketType[]>;
      createSale: (ticketId: number, precio: number) => Promise<TicketVenta>;
      printTicket: (html: string) => Promise<boolean>;
      notificarImpresionCompletada: () => void;

      // Authentication / session
      login: (credentials: { usuario: string; password: string }) => Promise<{ success: boolean; message?: string; user?: any }>;
      logout: () => Promise<{ success: boolean }>;
      getCurrentUser: () => Promise<any>;
      setMenu: (role: string) => Promise<void>;

      // Users (admin)
      getUsers: () => Promise<any[]>;
      getUserById: (id: number) => Promise<any>;
      createUser: (data: { nombre: string; usuario: string; password: string; rol: string }) => Promise<any>;
      updateUser: (data: { id: number; nombre: string; usuario: string; rol: string; activo: number }) => Promise<any>;
      changeUserPassword: (id: number, newPassword: string) => Promise<any>;
      deactivateUser: (id: number) => Promise<any>;
      deleteUser: (id: number) => Promise<any>;
    };
    ticketsImpresos?: boolean;
  }
}