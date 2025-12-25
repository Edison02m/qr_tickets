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

interface BotonConfig {
  id?: number;
  input_numero: number;
  tipo_ticket_id: number | null;
  tipo_ticket_nombre?: string;
  tipo_ticket_precio?: number;
  cantidad: number;
  descripcion: string;
  activo: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

interface BotonConfigRequest {
  input_numero: number;
  tipo_ticket_id: number;
  cantidad: number;
  descripcion?: string;
  activo?: boolean;
}

interface ConfigLog {
  id: number;
  accion: 'crear' | 'modificar' | 'eliminar';
  tabla_afectada: 'puertas' | 'config_relay' | 'tipos_ticket' | 'botones_tickets';
  registro_id: number;
  descripcion: string;
  datos_anteriores: any; // JSON object
  datos_nuevos: any; // JSON object
  fecha_hora: string;
  ip_address?: string;
}

interface ConfigLogFiltros {
  limit?: number;
  offset?: number;
  tabla?: string;
  accion?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

interface EstadisticaLog {
  tabla_afectada: string;
  accion: string;
  total: number;
}

export {};
