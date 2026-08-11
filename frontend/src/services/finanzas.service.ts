import { api } from './api';

export interface KPIFinancieroGlobal {
  honorarios_esperados: number;
  honorarios_generados: number;
  ingreso_real_recibido: number;
  total_cobrado_clientes: number;
  pendiente_cobro: number;
  egresos_realizados: number;
  pendiente_pago: number;
  saldo_terceros: number;
  fondos_retenidos: number;
  utilidad_pravia: number;
  participacion_pravia: number;
  total_presupuestado_general: number;
}

export interface ExpedienteItemFinanciero {
  expediente_id: string;
  folio: string;
  cliente: string;
  tipo_acto: string;
  notaria: string;
  notaria_numero?: string | null;
  abogado: string;
  fecha_apertura: string;
  fecha_firma?: string | null;
  estatus_expediente: string;
  total_presupuestado: number;
  participacion_pravia: number;
  total_cobrado: number;
  saldo_pendiente: number;
  total_egresado: number;
  pendiente_egresos: number;
  saldo_terceros: number;
  fondos_retenidos: number;
  utilidad_pravia: number;
  honorarios_generados: number;
  ingreso_real_honorarios: number;
  estado_financiero:
    | 'SIN_MOVIMIENTOS'
    | 'ANTICIPO_RECIBIDO'
    | 'PAGO_PARCIAL'
    | 'PENDIENTE_LIQUIDAR'
    | 'LIQUIDADO'
    | 'CON_EGRESOS_PENDIENTES';
  created_at: string;
}

export interface MovimientoGlobalItem {
  id: string;
  fecha: string;
  expediente_id?: string | null;
  folio_expediente: string;
  cliente: string;
  tipo_movimiento: string;
  naturaleza: 'INGRESO' | 'EGRESO';
  categoria: string;
  concepto: string;
  monto: number;
  forma_pago: string;
  referencia?: string | null;
  usuario_registro: string;
  estatus: string;
  comprobante_url?: string | null;
  factura_url?: string | null;
  motivo_reversion?: string | null;
}

export interface CobranzaItem {
  expediente_id: string;
  folio: string;
  cliente: string;
  tipo_acto: string;
  notaria: string;
  abogado: string;
  total_operacion: number;
  pagado: number;
  saldo: number;
  fecha_firma?: string | null;
  dias_atraso: number;
  alerta: 'FIRMA_PROXIMA_CON_SALDO' | 'FIRMADO_CON_SALDO' | 'ATRASADO' | 'PENDIENTE_ORDINARIO';
  estatus_expediente: string;
}

export interface EgresoItem {
  id: string;
  fecha: string;
  expediente_id?: string | null;
  folio_expediente: string;
  cliente: string;
  notaria: string;
  tipo_movimiento: string;
  categoria: string;
  concepto: string;
  monto: number;
  forma_pago: string;
  estatus: string;
  comprobante_url?: string | null;
  factura_url?: string | null;
}

export interface HonorariosDesgloseItem {
  nombre: string;
  esperados: number;
  generados: number;
  cobrados: number;
}

export const finanzasService = {
  getResumen: async (params?: Record<string, string>): Promise<{
    success: boolean;
    kpis: KPIFinancieroGlobal;
    expedientes: ExpedienteItemFinanciero[];
  }> => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/finanzas/resumen?${q}`);
  },

  getMovimientos: async (params?: Record<string, string>): Promise<{
    success: boolean;
    movimientos: MovimientoGlobalItem[];
    total: number;
  }> => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/finanzas/movimientos?${q}`);
  },

  getCobranza: async (params?: Record<string, string>): Promise<{
    success: boolean;
    kpis: {
      total_por_cobrar: number;
      expedientes_con_saldo: number;
      firmados_con_saldo: number;
      firmas_proximas_con_saldo: number;
    };
    cobranza: CobranzaItem[];
  }> => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/finanzas/cobranza?${q}`);
  },

  getEgresos: async (params?: Record<string, string>): Promise<{
    success: boolean;
    summary: {
      total_egresos_realizados: number;
      por_categoria: Record<string, number>;
    };
    egresos: EgresoItem[];
  }> => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/finanzas/egresos?${q}`);
  },

  getHonorarios: async (params?: Record<string, string>): Promise<{
    success: boolean;
    kpis: {
      honorarios_esperados: number;
      honorarios_generados: number;
      honorarios_cobrados: number;
      honorarios_pendientes: number;
    };
    desglose: {
      por_abogado: HonorariosDesgloseItem[];
      por_notaria: HonorariosDesgloseItem[];
      por_tipo_acto: HonorariosDesgloseItem[];
    };
  }> => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/finanzas/honorarios?${q}`);
  },

  getCatalogos: async (): Promise<{
    success: boolean;
    catalogos: {
      notarias: Array<{ id: string; nombre: string; numero_notaria: string }>;
      abogados: Array<{ id: string; nombre: string; apellido: string; rol: string }>;
      tipos_acto: Array<{ id: string; nombre: string }>;
      estatus_expediente: string[];
    };
  }> => {
    return api.get('/finanzas/catalogos');
  }
};
