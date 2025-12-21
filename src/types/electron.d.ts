/// <reference types="react-scripts" />

// Interfaces globales para tipos de datos del sistema
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

interface Puerta {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  lector_ip?: string;
  lector_port?: number;
  relay_number?: number;
  tiempo_apertura_segundos?: number;
  activo: boolean;
  fecha_creacion: string;
}

interface ConfigRelay {
  id: number;
  ip: string;
  port: number;
  timeout: number;
  reintentos: number;
  fecha_actualizacion: string;
}

export {};
