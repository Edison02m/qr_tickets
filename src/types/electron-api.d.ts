declare global {
  interface Window {
    electronAPI: {
      login: (credentials: { usuario: string; password: string }) => Promise<{ success: boolean; message?: string; user?: any }>;
      logout: () => Promise<{ success: boolean }>;
      getCurrentUser: () => Promise<any>;
      setMenu: (role: string) => Promise<any>;
      getTicketTypes: () => Promise<any[]>;
      getActiveTicketTypes: () => Promise<any[]>;
      createTicketType: (data: { nombre: string; precio: number }) => Promise<any>;
      updateTicketType: (data: { id: number; nombre: string; precio: number }) => Promise<any>;
      deleteTicketType: (id: number) => Promise<any>;
      toggleTicketTypeStatus: (id: number, active: boolean) => Promise<any>;
      createSale: (ticketTypeId: number, amount: number) => Promise<any>;
      getDailySales: () => Promise<any[]>;
      printTicket: (html: string) => Promise<{ success: boolean }>;
      // User management
      getUsers: () => Promise<any[]>;
      createUser: (data: { nombre: string; usuario: string; password: string; rol: string }) => Promise<any>;
      updateUser: (data: { id: number; nombre: string; rol: string }) => Promise<any>;
      deactivateUser: (id: number) => Promise<any>;
      deleteUser: (id: number) => Promise<any>;
      changePassword: (id: number, newPassword: string) => Promise<any>;
    };
  }
}
export {};
