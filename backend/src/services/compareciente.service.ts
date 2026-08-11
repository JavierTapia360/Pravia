import { PrismaClient, TipoPersona, FormaComparecencia } from '@prisma/client';
import * as crypto from 'crypto';

export class ComparecienteService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Helper para normalizar cadenas de búsqueda
   */
  private normalizeSearchString(text: string): string {
    return text
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Búsqueda general y duplicados
   */
  public async buscarDuplicados(query: { rfc?: string; curp?: string; nombre?: string }) {
    const matches: any[] = [];

    if (query.curp && query.curp.trim().length > 0) {
      const cleanCurp = query.curp.trim().toUpperCase();
      const pf = await this.prisma.personaFisica.findFirst({
        where: {
          curp: { equals: cleanCurp, mode: 'insensitive' },
          archived_at: null
        },
        include: { compareciente: true }
      });
      if (pf) {
        matches.push({ tipo: 'CURP_COINCIDENCIA_EXACTA', record: pf });
      }
    }

    if (query.rfc && query.rfc.trim().length > 0) {
      const cleanRfc = query.rfc.trim().toUpperCase();
      const pf = await this.prisma.personaFisica.findFirst({
        where: {
          rfc: { equals: cleanRfc, mode: 'insensitive' },
          archived_at: null
        },
        include: { compareciente: true }
      });
      if (pf) matches.push({ tipo: 'RFC_FISICA_EXACTO', record: pf });

      const pm = await this.prisma.personaMoral.findFirst({
        where: {
          rfc: { equals: cleanRfc, mode: 'insensitive' },
          archived_at: null
        },
        include: { compareciente: true }
      });
      if (pm) matches.push({ tipo: 'RFC_MORAL_EXACTO', record: pm });
    }

    if (query.nombre && query.nombre.trim().length > 0) {
      const cleanNombre = this.normalizeSearchString(query.nombre);
      const candidates = await this.prisma.compareciente.findMany({
        where: {
          nombre_busqueda: { contains: cleanNombre, mode: 'insensitive' },
          archived_at: null
        },
        include: {
          personaFisica: true,
          personaMoral: true
        },
        take: 10
      });
      for (const c of candidates) {
        matches.push({ tipo: 'NOMBRE_SIMILAR', record: c });
      }
    }

    return matches;
  }

  /**
   * Listado maestro con filtros y paginación
   */
  public async listarMaster(params: {
    tipo_persona?: TipoPersona;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 25;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      archived_at: null
    };

    if (params.tipo_persona) {
      whereClause.tipo_persona = params.tipo_persona;
    }

    if (params.search && params.search.trim().length > 0) {
      const cleanSearch = this.normalizeSearchString(params.search);
      whereClause.OR = [
        { nombre_busqueda: { contains: cleanSearch, mode: 'insensitive' } },
        { personaFisica: { curp: { contains: cleanSearch, mode: 'insensitive' } } },
        { personaFisica: { rfc: { contains: cleanSearch, mode: 'insensitive' } } },
        { personaMoral: { rfc: { contains: cleanSearch, mode: 'insensitive' } } }
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.compareciente.count({ where: whereClause }),
      this.prisma.compareciente.findMany({
        where: whereClause,
        include: {
          personaFisica: true,
          personaMoral: true,
          domicilios: { where: { principal: true, vigente: true, archived_at: null } },
          contactos: { where: { principal: true, activo: true, archived_at: null } },
          expedientes: {
            where: { estatus: 'ACTIVO', archived_at: null },
            include: { expediente: true, caracter: true }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      })
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Obtener detalle completo de Compareciente Maestra
   */
  public async obtenerPorId(id: string) {
    const compareciente = await this.prisma.compareciente.findUnique({
      where: { id },
      include: {
        personaFisica: {
          include: {
            matrimoniosComoPersona1: {
              where: { vigente: true, archived_at: null },
              include: { persona2: { include: { compareciente: true } } }
            },
            matrimoniosComoPersona2: {
              where: { vigente: true, archived_at: null },
              include: { persona1: { include: { compareciente: true } } }
            }
          }
        },
        personaMoral: {
          include: {
            instrumentos: { where: { archived_at: null } },
            representantes: {
              where: { vigente: true, archived_at: null },
              include: {
                representantePersonaFisica: { include: { compareciente: true } },
                caracterRepresentacion: true,
                instrumento: true
              }
            }
          }
        },
        domicilios: { where: { archived_at: null } },
        contactos: { where: { archived_at: null } },
        identificaciones: { where: { archived_at: null } },
        documentos: {
          where: { archived_at: null },
          include: { documento: true }
        },
        expedientes: {
          where: { archived_at: null },
          include: {
            expediente: true,
            caracter: true
          }
        }
      }
    });

    if (!compareciente || compareciente.archived_at) {
      throw new Error(`Compareciente con ID '${id}' no fue encontrado o está archivado.`);
    }

    return compareciente;
  }

  /**
   * Crear Persona Física en transacción inmutable
   */
  public async crearPersonaFisica(dto: {
    nombre: string;
    apellido_paterno?: string;
    apellido_materno?: string;
    sexo?: any;
    fecha_nacimiento?: string;
    lugar_nacimiento?: string;
    nacionalidad?: string;
    curp?: string;
    rfc?: string;
    estado_civil?: any;
    regimen_matrimonial?: any;
    ocupacion?: string;
    actividad_economica?: string;
    domicilio_principal?: any;
    contacto_principal?: any;
    identificacion_principal?: any;
    creado_por_id: string;
  }) {
    const nombreCompleto = [dto.nombre, dto.apellido_paterno, dto.apellido_materno]
      .filter(Boolean)
      .join(' ')
      .trim();

    const nombreBusqueda = this.normalizeSearchString(nombreCompleto);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Crear cabecera compareciente
      const compareciente = await tx.compareciente.create({
        data: {
          tipo_persona: TipoPersona.FISICA,
          nombre_busqueda: nombreBusqueda,
          creado_por_id: dto.creado_por_id
        }
      });

      // 2. Crear subperfil persona_fisica
      const personaFisica = await tx.personaFisica.create({
        data: {
          compareciente_id: compareciente.id,
          nombre: dto.nombre.trim(),
          apellido_paterno: dto.apellido_paterno?.trim(),
          apellido_materno: dto.apellido_materno?.trim(),
          nombre_completo_calculado: nombreCompleto,
          sexo: dto.sexo,
          fecha_nacimiento: dto.fecha_nacimiento ? new Date(dto.fecha_nacimiento) : null,
          lugar_nacimiento: dto.lugar_nacimiento,
          nacionalidad: dto.nacionalidad || 'Mexicana',
          curp: dto.curp ? dto.curp.trim().toUpperCase() : null,
          rfc: dto.rfc ? dto.rfc.trim().toUpperCase() : null,
          estado_civil: dto.estado_civil,
          regimen_matrimonial: dto.regimen_matrimonial,
          ocupacion: dto.ocupacion,
          actividad_economica: dto.actividad_economica
        }
      });

      // 3. Crear Domicilio principal si se proporciona
      if (dto.domicilio_principal) {
        await tx.comparecienteDomicilio.create({
          data: {
            compareciente_id: compareciente.id,
            tipo: dto.domicilio_principal.tipo || 'PARTICULAR',
            calle: dto.domicilio_principal.calle,
            exterior: dto.domicilio_principal.exterior,
            interior: dto.domicilio_principal.interior,
            colonia: dto.domicilio_principal.colonia,
            municipio: dto.domicilio_principal.municipio,
            estado: dto.domicilio_principal.estado,
            codigo_postal: dto.domicilio_principal.codigo_postal,
            principal: true,
            creado_por_id: dto.creado_por_id
          }
        });
      }

      // 4. Crear Contacto principal si se proporciona
      if (dto.contacto_principal) {
        await tx.comparecienteContacto.create({
          data: {
            compareciente_id: compareciente.id,
            tipo: dto.contacto_principal.tipo || 'TELEFONO',
            valor: dto.contacto_principal.valor,
            principal: true,
            creado_por_id: dto.creado_por_id
          }
        });
      }

      // 5. Registrar Evento de Auditoría y Outbox
      const correlationId = crypto.randomUUID();
      await tx.auditLog.create({
        data: {
          user_id: dto.creado_por_id,
          accion: 'CREAR_PERSONA_FISICA',
          entidad: 'Compareciente',
          entidad_id: compareciente.id,
          valores_nuevos: JSON.parse(JSON.stringify({ compareciente, personaFisica })),
          detalles: { modulo: 'COMPARECIENTES' },
          correlation_id: correlationId
        }
      });

      await tx.domainEventOutbox.create({
        data: {
          event_type: 'ComparecienteCreado',
          aggregate_type: 'Compareciente',
          aggregate_id: compareciente.id,
          payload: {
            compareciente_id: compareciente.id,
            tipo_persona: 'FISICA',
            nombre_completo: nombreCompleto,
            actor_user_id: dto.creado_por_id
          },
          correlation_id: correlationId
        }
      });

      return { compareciente, personaFisica };
    });
  }

  /**
   * Crear Persona Moral en transacción inmutable
   */
  public async crearPersonaMoral(dto: {
    razon_social: string;
    nombre_comercial?: string;
    tipo_societario?: string;
    nacionalidad?: string;
    rfc?: string;
    fecha_constitucion?: string;
    folio_mercantil?: string;
    objeto_social_resumido?: string;
    creado_por_id: string;
  }) {
    const nombreBusqueda = this.normalizeSearchString(dto.razon_social);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Crear cabecera compareciente
      const compareciente = await tx.compareciente.create({
        data: {
          tipo_persona: TipoPersona.MORAL,
          nombre_busqueda: nombreBusqueda,
          creado_por_id: dto.creado_por_id
        }
      });

      // 2. Crear subperfil persona_moral
      const personaMoral = await tx.personaMoral.create({
        data: {
          compareciente_id: compareciente.id,
          razon_social: dto.razon_social.trim(),
          nombre_comercial: dto.nombre_comercial?.trim(),
          tipo_societario: dto.tipo_societario,
          nacionalidad: dto.nacionalidad || 'Mexicana',
          rfc: dto.rfc ? dto.rfc.trim().toUpperCase() : null,
          fecha_constitucion: dto.fecha_constitucion ? new Date(dto.fecha_constitucion) : null,
          folio_mercantil: dto.folio_mercantil,
          objeto_social_resumido: dto.objeto_social_resumido
        }
      });

      // 3. Registrar Evento de Auditoría y Outbox
      const correlationId = crypto.randomUUID();
      await tx.auditLog.create({
        data: {
          user_id: dto.creado_por_id,
          accion: 'CREAR_PERSONA_MORAL',
          entidad: 'Compareciente',
          entidad_id: compareciente.id,
          valores_nuevos: JSON.parse(JSON.stringify({ compareciente, personaMoral })),
          detalles: { modulo: 'COMPARECIENTES' },
          correlation_id: correlationId
        }
      });

      await tx.domainEventOutbox.create({
        data: {
          event_type: 'ComparecienteCreado',
          aggregate_type: 'Compareciente',
          aggregate_id: compareciente.id,
          payload: {
            compareciente_id: compareciente.id,
            tipo_persona: 'MORAL',
            razon_social: dto.razon_social,
            actor_user_id: dto.creado_por_id
          },
          correlation_id: correlationId
        }
      });

      return { compareciente, personaMoral };
    });
  }

  /**
   * Archiva (soft-delete) o elimina físicamente un compareciente.
   * - Si tiene expedientes activos → sólo se permite archivar (soft-delete).
   * - Si no tiene expedientes y modo='ELIMINAR' → eliminación física con confirmación.
   * - Por defecto siempre archiva (nunca borra físico sin pedirlo explícitamente).
   */
  public async archivarCompareciente(dto: {
    id: string;
    usuario_id: string;
    motivo?: string;
    modo?: 'ARCHIVAR' | 'ELIMINAR';
  }) {
    const comp = await this.prisma.compareciente.findUnique({
      where: { id: dto.id },
      include: {
        _count: {
          select: {
            expedientes: { where: { estatus: 'ACTIVO', archived_at: null } }
          }
        }
      }
    });

    if (!comp) throw new Error(`Compareciente con ID '${dto.id}' no encontrado.`);
    if (comp.archived_at) throw new Error('Este compareciente ya está archivado.');

    const tieneExpedientesActivos = comp._count.expedientes > 0;

    if (dto.modo === 'ELIMINAR' && !tieneExpedientesActivos) {
      // Eliminación física con AuditLog previo
      const correlationId = crypto.randomUUID();
      await this.prisma.auditLog.create({
        data: {
          user_id: dto.usuario_id,
          accion: 'ELIMINAR_COMPARECIENTE',
          entidad: 'Compareciente',
          entidad_id: dto.id,
          valores_nuevos: { eliminado: true, motivo: dto.motivo || 'Sin motivo especificado' },
          detalles: { modulo: 'COMPARECIENTES', modo: 'ELIMINACION_FISICA' },
          correlation_id: correlationId
        }
      });
      await this.prisma.compareciente.delete({ where: { id: dto.id } });
      return { accion: 'ELIMINADO', id: dto.id };
    }

    // En cualquier otro caso → archivar (soft-delete)
    const correlationId = crypto.randomUUID();
    const archivado = await this.prisma.compareciente.update({
      where: { id: dto.id },
      data: { archived_at: new Date(), estatus: 'ARCHIVADO' as any }
    });

    await this.prisma.auditLog.create({
      data: {
        user_id: dto.usuario_id,
        accion: 'ARCHIVAR_COMPARECIENTE',
        entidad: 'Compareciente',
        entidad_id: dto.id,
        valores_nuevos: { archivado: true, motivo: dto.motivo || 'Sin motivo especificado' },
        detalles: {
          modulo: 'COMPARECIENTES',
          modo: 'ARCHIVADO',
          tenia_expedientes_activos: tieneExpedientesActivos,
          modo_solicitado: dto.modo || 'ARCHIVAR'
        },
        correlation_id: correlationId
      }
    });

    return { accion: 'ARCHIVADO', id: dto.id, archivado_at: archivado.archived_at };
  }

  /**
   * Vinculación contextual con Expediente
   */
  public async vincularAExpediente(dto: {
    expediente_id: string;
    compareciente_id: string;
    caracter_id: string;
    forma_comparecencia?: FormaComparecencia;
    observaciones?: string;
    creado_por_id: string;
  }) {
    return await this.prisma.$transaction(async (tx) => {
      const existente = await tx.expedienteCompareciente.findFirst({
        where: {
          expediente_id: dto.expediente_id,
          compareciente_id: dto.compareciente_id,
          caracter_id: dto.caracter_id,
          archived_at: null
        }
      });

      if (existente) {
        if (existente.estatus === 'INACTIVO') {
          return await tx.expedienteCompareciente.update({
            where: { id: existente.id },
            data: {
              estatus: 'ACTIVO',
              forma_comparecencia: dto.forma_comparecencia || 'PROPIO_DERECHO',
              observaciones: dto.observaciones
            }
          });
        }
        return existente;
      }

      const vinculo = await tx.expedienteCompareciente.create({
        data: {
          expediente_id: dto.expediente_id,
          compareciente_id: dto.compareciente_id,
          caracter_id: dto.caracter_id,
          forma_comparecencia: dto.forma_comparecencia || 'PROPIO_DERECHO',
          observaciones: dto.observaciones,
          creado_por_id: dto.creado_por_id
        }
      });

      const correlationId = crypto.randomUUID();
      await tx.auditLog.create({
        data: {
          user_id: dto.creado_por_id,
          accion: 'VINCULAR_A_EXPEDIENTE',
          entidad: 'ExpedienteCompareciente',
          entidad_id: vinculo.id,
          valores_nuevos: JSON.parse(JSON.stringify(vinculo)),
          detalles: { modulo: 'COMPARECIENTES' },
          correlation_id: correlationId
        }
      });

      await tx.domainEventOutbox.create({
        data: {
          event_type: 'ComparecienteVinculadoAExpediente',
          aggregate_type: 'Expediente',
          aggregate_id: dto.expediente_id,
          payload: {
            expediente_id: dto.expediente_id,
            compareciente_id: dto.compareciente_id,
            caracter_id: dto.caracter_id,
            actor_user_id: dto.creado_por_id
          },
          correlation_id: correlationId
        }
      });

      return vinculo;
    });
  }

  /**
   * Retiro lógico del vínculo con el expediente sin eliminar la ficha maestra
   */
  public async desvincularDeExpediente(vinculoId: string, actorUserId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const vinculo = await tx.expedienteCompareciente.findUnique({
        where: { id: vinculoId }
      });

      if (!vinculo) {
        throw new Error(`El vínculo con ID '${vinculoId}' no existe.`);
      }

      const actualizado = await tx.expedienteCompareciente.update({
        where: { id: vinculoId },
        data: {
          estatus: 'INACTIVO',
          archived_at: new Date()
        }
      });

      const correlationId = crypto.randomUUID();
      await tx.auditLog.create({
        data: {
          user_id: actorUserId,
          accion: 'DESVINCULAR_DE_EXPEDIENTE',
          entidad: 'ExpedienteCompareciente',
          entidad_id: vinculoId,
          valores_anteriores: JSON.parse(JSON.stringify(vinculo)),
          valores_nuevos: JSON.parse(JSON.stringify(actualizado)),
          detalles: { modulo: 'COMPARECIENTES' },
          correlation_id: correlationId
        }
      });

      await tx.domainEventOutbox.create({
        data: {
          event_type: 'VinculoComparecienteRetirado',
          aggregate_type: 'Expediente',
          aggregate_id: vinculo.expediente_id,
          payload: {
            expediente_id: vinculo.expediente_id,
            compareciente_id: vinculo.compareciente_id,
            actor_user_id: actorUserId
          },
          correlation_id: correlationId
        }
      });

      return actualizado;
    });
  }

  /**
   * Obtiene el Archivo Documental del Compareciente con URLs firmadas y agrupado por carpetas
   */
  public async obtenerArchivoDocumental(comparecienteId: string) {
    const compareciente = await this.prisma.compareciente.findUnique({
      where: { id: comparecienteId },
      include: {
        documentos: {
          where: { archived_at: null },
          include: {
            documento: true
          }
        },
        personaFisica: true,
        personaMoral: true
      }
    });

    if (!compareciente) throw new Error('Compareciente no encontrado');

    const isMoral = compareciente.tipo_persona === 'MORAL';
    const carpetasBase = isMoral
      ? ['Constitución', 'Fiscal', 'Domicilio', 'Representación', 'Registro Mercantil', 'Identificaciones', 'Otros']
      : ['Identificación', 'Fiscal', 'Domicilio', 'Estado Civil', 'Migratorio', 'Poderes', 'Otros'];

    const items: any[] = [];
    for (const link of compareciente.documentos) {
      const doc = link.documento;
      let urlFirmada = '';
      try {
        if (doc.storage_key) {
          const { getSignedUrl } = await import('./supabase.service');
          urlFirmada = await getSignedUrl(doc.storage_key);
        }
      } catch (err) {
        console.warn(`[ArchivoDocumental] No se pudo obtener URL firmada para ${doc.id}`);
      }

      items.push({
        id: doc.id,
        link_id: link.id,
        nombre: doc.nombre_original,
        filename: doc.nombre_original,
        categoria: link.categoria,
        mime_type: doc.mime_type,
        size_bytes: doc.size_bytes,
        fecha_carga: doc.fecha_carga,
        estatus: doc.estatus,
        principal: link.principal,
        url_firmada: urlFirmada
      });
    }

    return {
      compareciente_id: comparecienteId,
      tipo_persona: compareciente.tipo_persona,
      carpetas_sugeridas: carpetasBase,
      documentos: items
    };
  }

  /**
   * Sube y vincula un nuevo documento directamente al Archivo Documental del Compareciente
   */
  public async agregarDocumentoMaster(params: {
    comparecienteId: string;
    userId: string;
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    categoria: string;
  }) {
    const { comparecienteId, userId, buffer, fileName, mimeType, categoria } = params;
    const { uploadFile } = await import('./supabase.service');

    const storageKey = `documentos/comparecientes/${comparecienteId}/${Date.now()}_${fileName}`;
    await uploadFile(buffer, storageKey, mimeType);

    return await this.prisma.$transaction(async (tx) => {
      const docMaster = await tx.documento.create({
        data: {
          nombre_original: fileName,
          nombre_interno: fileName,
          tipo: categoria || 'IDENTIFICACION',
          categoria: 'OTROS',
          mime_type: mimeType,
          size_bytes: buffer.length,
          storage_key: storageKey,
          estatus: 'VIGENTE',
          subido_por_id: userId,
          compareciente_id: comparecienteId
        }
      });

      const vinculo = await tx.comparecienteDocumento.create({
        data: {
          compareciente_id: comparecienteId,
          documento_id: docMaster.id,
          categoria: (categoria as any) || 'OTROS',
          creado_por_id: userId
        }
      });

      return { docMaster, vinculo };
    });
  }
}
