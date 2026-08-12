import { api } from './api';

export interface CalidadInformacionResult {
  porcentaje: number;
  faltantes: string[];
}

export function calcularCalidadInformacion(compareciente: any): CalidadInformacionResult {
  if (!compareciente) return { porcentaje: 0, faltantes: ['Perfil no encontrado'] };

  const faltantes: string[] = [];
  let totalPuntos = 0;
  let puntosObtenidos = 0;

  if (compareciente.tipo_persona === 'FISICA') {
    const pf = compareciente.personaFisica || compareciente.persona_fisica || {};

    // 1. Identidad básica (20 pts)
    totalPuntos += 20;
    if (pf.nombre && (pf.apellido_paterno || pf.apellido_materno)) {
      puntosObtenidos += 20;
    } else {
      faltantes.push('Nombre y Apellidos completos');
    }

    // 2. CURP (15 pts)
    totalPuntos += 15;
    if (pf.curp && pf.curp.length >= 18) {
      puntosObtenidos += 15;
    } else {
      faltantes.push('CURP válido');
    }

    // 3. RFC (15 pts)
    totalPuntos += 15;
    if (pf.rfc && pf.rfc.length >= 10) {
      puntosObtenidos += 15;
    } else {
      faltantes.push('RFC válido');
    }

    // 4. Estado Civil (10 pts)
    totalPuntos += 10;
    if (pf.estado_civil) {
      puntosObtenidos += 10;
      if (pf.estado_civil === 'CASADO') {
        totalPuntos += 10;
        if (pf.regimen_matrimonial) {
          puntosObtenidos += 10;
        } else {
          faltantes.push('Régimen Matrimonial');
        }
      }
    } else {
      faltantes.push('Estado Civil');
    }

    // 5. Domicilio Principal (15 pts)
    totalPuntos += 15;
    const dom = compareciente.domicilios?.find((d: any) => d.principal || d.vigente);
    if (dom && dom.calle && dom.colonia) {
      puntosObtenidos += 15;
    } else {
      faltantes.push('Domicilio completo');
    }

    // 6. Identificación Vigente (15 pts)
    totalPuntos += 15;
    const iden = compareciente.identificaciones?.find((i: any) => i.principal || i.estatus === 'VIGENTE');
    if (iden && iden.numero) {
      puntosObtenidos += 15;
    } else {
      faltantes.push('Identificación Oficial vigente');
    }
  } else {
    // MORAL
    const pm = compareciente.personaMoral || compareciente.persona_moral || {};

    // 1. Razón Social (20 pts)
    totalPuntos += 20;
    if (pm.razon_social) {
      puntosObtenidos += 20;
    } else {
      faltantes.push('Razón Social');
    }

    // 2. RFC (20 pts)
    totalPuntos += 20;
    if (pm.rfc && pm.rfc.length >= 12) {
      puntosObtenidos += 20;
    } else {
      faltantes.push('RFC de Persona Moral');
    }

    // 3. Folio Mercantil y Constitución (20 pts)
    totalPuntos += 20;
    if (pm.folio_mercantil || pm.fecha_constitucion) {
      puntosObtenidos += 20;
    } else {
      faltantes.push('Folio Mercantil o Fecha de Constitución');
    }

    // 4. Domicilio Social (20 pts)
    totalPuntos += 20;
    const dom = compareciente.domicilios?.find((d: any) => d.principal || d.vigente);
    if (dom && dom.calle) {
      puntosObtenidos += 20;
    } else {
      faltantes.push('Domicilio Social/Fiscal');
    }

    // 5. Representantes Vigentes (20 pts)
    totalPuntos += 20;
    if (pm.representantes && pm.representantes.length > 0) {
      puntosObtenidos += 20;
    } else {
      faltantes.push('Representante Legal asignado');
    }
  }

  const porcentaje = Math.round((puntosObtenidos / totalPuntos) * 100);
  return { porcentaje, faltantes };
}

export const comparecientesService = {
  buscarDuplicados: async (query: { rfc?: string; curp?: string; nombre?: string }) => {
    const params = new URLSearchParams();
    if (query.rfc) params.append('rfc', query.rfc);
    if (query.curp) params.append('curp', query.curp);
    if (query.nombre) params.append('nombre', query.nombre);
    return api.get(`/comparecientes/duplicados?${params.toString()}`);
  },

  listarMaster: async (params?: { tipo_persona?: string; search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.tipo_persona) query.append('tipo_persona', params.tipo_persona);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    return api.get(`/comparecientes?${query.toString()}`);
  },

  obtenerPorId: async (id: string) => {
    return api.get(`/comparecientes/${id}`);
  },

  obtenerCatalogos: async () => {
    return api.get('/comparecientes/catalogos');
  },

  crearPersonaFisica: async (data: any) => {
    return api.post('/comparecientes/persona-fisica', data);
  },

  crearPersonaMoral: async (data: any) => {
    return api.post('/comparecientes/persona-moral', data);
  },

  vincularAExpediente: async (data: {
    expediente_id: string;
    compareciente_id: string;
    caracter_id: string;
    forma_comparecencia?: string;
    observaciones?: string;
  }) => {
    return api.post('/comparecientes/vincular-expediente', data);
  },

  desvincularDeExpediente: async (vinculoId: string) => {
    return api.delete(`/comparecientes/vincular-expediente/${vinculoId}`);
  },

  validarVinculoExpediente: async (vinculoId: string, datos_validados: boolean) => {
    return api.patch(`/comparecientes/vincular-expediente/${vinculoId}/validacion`, { datos_validados });
  },

  archivarCompareciente: async (id: string, params: { motivo?: string }) => {
    return api.patch(`/comparecientes/${id}/archivar`, params);
  }
};
