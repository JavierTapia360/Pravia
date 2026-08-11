import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ExpedienteEstatus, TipoMovimiento, NaturalezaMovimiento, DocEstatus } from '@prisma/client';
import { ExpedienteWorkflowService } from '../services/expedienteWorkflow.service';
import { calculateExpedienteProgress } from '../services/expedienteProgress.service';
import { downloadFile, uploadFile, deleteFile } from '../services/supabase.service';
import prisma from '../config/prisma';
import { CotizacionConversionService } from '../services/cotizacionConversion.service';
import { CotizacionBusinessError } from '../domain/cotizacionWorkflow';

const cotizacionConversionService = new CotizacionConversionService(prisma);

// 1. Listar Expedientes con Filtros y Paginación
export const getExpedientes = async (req: Request, res: Response) => {
  try {
    const { estatus, abogado_id, tipo_acto_id, search, limit = 50, page = 1 } = req.query;

    const where: any = {
      archived_at: null
    };

    if (estatus) {
      where.estatus = estatus as ExpedienteEstatus;
    }

    if (abogado_id) {
      where.abogado_id = String(abogado_id);
    }

    if (tipo_acto_id) {
      where.tipo_acto_id = String(tipo_acto_id);
    }

    if (search) {
      const searchStr = String(search).trim();
      where.OR = [
        { numero_pravia: { contains: searchStr, mode: 'insensitive' } },
        { numero_notaria: { contains: searchStr, mode: 'insensitive' } },
        { cliente_alias: { contains: searchStr, mode: 'insensitive' } }
      ];
    }

    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const [expedientes, total] = await Promise.all([
      prisma.expediente.findMany({
        where,
        take,
        skip,
        orderBy: { updated_at: 'desc' },
        include: {
          tipo_acto: { select: { id: true, nombre: true } },
          abogado: { select: { id: true, nombre: true, apellido: true } },
          etapaActual: { select: { id: true, nombre_snapshot: true, fecha_inicio: true } },
          _count: {
            select: {
              comparecientes: true,
              requisitos_docs: true,
              movimientosFinancieros: true
            }
          }
        }
      }),
      prisma.expediente.count({ where })
    ]);

    res.json({
      data: expedientes,
      meta: {
        total,
        page: Number(page),
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar expedientes', detail: error.message });
  }
};

// 2. Obtener Detalle Completo de Expediente
export const getExpedienteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const expediente = await prisma.expediente.findUnique({
      where: { id },
      include: {
        tipo_acto: true,
        abogado: { select: { id: true, nombre: true, apellido: true, email: true } },
        gestor: { select: { id: true, nombre: true, apellido: true } },
        creador: { select: { id: true, nombre: true, apellido: true } },
        notaria: true,
        cotizacion: {
          include: {
            versiones: true,
            prospecto: true
          }
        },
        etapaActual: true,
        etapas: { orderBy: { orden_snapshot: 'asc' } },
        comparecientes: {
          include: {
            compareciente: {
              include: {
                personaFisica: true,
                personaMoral: true
              }
            },
            caracter: true
          }
        },
        requisitos_docs: {
          include: {
            documentoVinculos: {
              include: { documento: true }
            }
          }
        },
        expedienteDocumentos: {
          where: { estatus: 'ACTIVO' },
          include: { documento: true }
        },
        movimientosFinancieros: {
          where: { estatus: { notIn: ['CANCELADO', 'REVERTIDO'] } },
          orderBy: { fecha_movimiento: 'desc' },
          include: {
            capturado_por: { select: { id: true, nombre: true, apellido: true } },
            validado_por: { select: { id: true, nombre: true, apellido: true } }
          }
        },
        actividades: {
          take: 20,
          orderBy: { created_at: 'desc' },
          include: { usuario: { select: { id: true, nombre: true, apellido: true } } }
        },
        tareas: {
          where: { estatus: { not: 'CANCELADA' } },
          include: { asignado_a: { select: { id: true, nombre: true, apellido: true } } }
        }
      }
    });

    if (!expediente) {
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }

    res.json(expediente);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener detalle del expediente', detail: error.message });
  }
};

// 3. Creación Directa de Expediente
export const createExpediente = async (req: Request, res: Response) => {
  try {
    const {
      tipo_acto_id,
      abogado_id,
      cliente_alias,
      descripcion,
      valor_operacion,
      notaria_id,
      datos_operacion
    } = req.body;

    const creador_id = (req as any).user?.id || abogado_id;

    if (!tipo_acto_id || !abogado_id || !cliente_alias) {
      return res.status(400).json({ error: 'Campos obligatorios requeridos: tipo_acto_id, abogado_id, cliente_alias' });
    }

    // Buscar versiones vigentes del TipoActo
    const [tipoActo, formVer, flujoVer, plantDocVer] = await Promise.all([
      prisma.tipoActo.findUnique({ where: { id: tipo_acto_id } }),
      prisma.formularioVersion.findFirst({ where: { tipo_acto_id }, orderBy: { version: 'desc' } }),
      prisma.flujoVersion.findFirst({ where: { tipo_acto_id }, orderBy: { version: 'desc' } }),
      prisma.plantillaDocumentalVersion.findFirst({ where: { tipo_acto_id }, orderBy: { version: 'desc' } })
    ]);

    if (!tipoActo) {
      return res.status(404).json({ error: 'TipoActo no encontrado' });
    }

    // Generar Número PRAVIA correlativo
    const countAño = await prisma.expediente.count();
    const añoActual = new Date().getFullYear();
    const numero_pravia = `EXP-${añoActual}-${String(countAño + 1).padStart(4, '0')}`;

    const expediente = await prisma.$transaction(async (tx) => {
      const exp = await tx.expediente.create({
        data: {
          numero_pravia,
          tipo_acto_id,
          formulario_version_id: formVer?.id,
          flujo_version_id: flujoVer?.id,
          plantilla_doc_version_id: plantDocVer?.id,
          abogado_id,
          creador_id,
          cliente_alias,
          descripcion,
          valor_operacion: valor_operacion ? Number(valor_operacion) : null,
          notaria_id,
          datos_operacion,
          estatus: 'ABIERTO'
        }
      });

      // Crear primera etapa del flujo si existe versión
      if (flujoVer && Array.isArray(flujoVer.etapas_json) && flujoVer.etapas_json.length > 0) {
        const primera = (flujoVer.etapas_json as any[])[0];
        const etapaInstancia = await tx.expedienteEtapa.create({
          data: {
            expediente_id: exp.id,
            flujo_version_id: flujoVer.id,
            clave_snapshot: primera.clave,
            nombre_snapshot: primera.nombre,
            orden_snapshot: primera.orden || 1,
            duracion_esperada_snapshot: primera.dias || 3,
            responsable_id: abogado_id
          }
        });

        await tx.expediente.update({
          where: { id: exp.id },
          data: {
            expediente_etapa_actual_id: etapaInstancia.id,
            etapa_actual_nombre: primera.nombre
          }
        });
      }

      // Crear requisitos documentales iniciales si existen
      if (plantDocVer && Array.isArray(plantDocVer.requisitos_json)) {
        for (const reqItem of (plantDocVer.requisitos_json as any[])) {
          await tx.expedienteRequisitoDoc.create({
            data: {
              expediente_id: exp.id,
              nombre: reqItem.nombre,
              categoria: reqItem.categoria || 'PROYECTO',
              obligatorio: reqItem.obligatorio ?? true
            }
          });
        }
      }

      // Registrar Actividad
      await tx.expedienteActividad.create({
        data: {
          expediente_id: exp.id,
          usuario_id: creador_id,
          tipo: 'CAMBIO_ESTATUS',
          titulo: 'Apertura de Expediente',
          descripcion: `Expediente aperturado exitosamente con folio ${exp.numero_pravia}`
        }
      });

      return exp;
    });

    res.status(201).json(expediente);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear expediente', detail: error.message });
  }
};

// 4. Conversión de Cotización Aceptada a Expediente
export const convertCotizacionToExpediente = async (req: Request, res: Response) => {
  try {
    const { cotizacion_id, abogado_id, tipo_acto_id, user_id } = req.body;
    const result = await cotizacionConversionService.convert({
      cotizacionId: cotizacion_id,
      abogadoId: abogado_id,
      tipoActoId: tipo_acto_id,
      actorUserId: (req as any).user?.id || user_id,
      correlationId: (req as any).correlationId,
    });
    res.status(result.alreadyConverted ? 200 : 201).json({
      ...result.expediente,
      idempotent: result.alreadyConverted,
      correlation_id: result.correlationId,
      anticipo_validado: result.validatedAdvanceTotal,
    });
  } catch (error: any) {
    console.error('[CONVERT_COTIZACION_ERROR]', error);
    if (error instanceof CotizacionBusinessError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: 'No fue posible convertir la cotización a expediente.', code: 'CONVERSION_FAILED' });
  }
};

// 5. Transición de Estado con Control de Concurrencia Optimista
export const transitionEstatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { expected_version, nuevo_estatus, notas } = req.body;
    const actor_user_id = (req as any).user?.id;

    if (!actor_user_id) {
      return res.status(401).json({ error: 'Usuario no autenticado en la sesión' });
    }

    if (expected_version === undefined || !nuevo_estatus) {
      return res.status(400).json({ error: 'Campos requeridos: expected_version, nuevo_estatus' });
    }

    const workflowService = new ExpedienteWorkflowService(prisma);
    const expedienteActualizado = await workflowService.ejecutarTransicion({
      expedienteId: id,
      versionActual: Number(expected_version),
      nuevoEstatus: nuevo_estatus as ExpedienteEstatus,
      actorUserId: actor_user_id,
      observaciones: notas
    });

    res.json(expedienteActualizado);
  } catch (error: any) {
    const statusCode = error.statusCode || (error.message.includes('UNAUTHORIZED') ? 401 : 500);
    res.status(statusCode).json({ error: error.message });
  }
};

// Helper de normalización de TipoMovimiento Prisma Enum
function normalizarTipoMovimiento(tipo?: string): TipoMovimiento {
  const t = (tipo || '').toUpperCase().trim();
  if (['ANTICIPO', 'ADVANCE'].includes(t)) return 'ANTICIPO';
  if (['ABONO', 'PAGO_PARCIAL', 'PARCIAL'].includes(t)) return 'ABONO';
  if (['PAGO_UNICO', 'UNICO'].includes(t)) return 'PAGO_UNICO';
  if (['PAGO_CONTRA_FIRMA', 'CONTRA_FIRMA', 'FIRMA', 'LIQUIDACION', 'LIQUIDACION_FINAL'].includes(t)) return 'PAGO_CONTRA_FIRMA';
  if (['PAGO_CONTRA_ENTREGA', 'CONTRA_ENTREGA', 'ENTREGA'].includes(t)) return 'PAGO_CONTRA_ENTREGA';
  if (['DEVOLUCION', 'REFUND'].includes(t)) return 'DEVOLUCION';
  if (['EGRESO_NOTARIA', 'NOTARIA', 'PAGO_NOTARIA'].includes(t)) return 'EGRESO_NOTARIA';
  if (['EGRESO_TERCEROS', 'TERCEROS', 'DERECHOS'].includes(t)) return 'EGRESO_TERCEROS';
  if (['AJUSTE'].includes(t)) return 'AJUSTE';
  return 'ANTICIPO';
}

function normalizarNaturaleza(nat?: string): NaturalezaMovimiento {
  const n = (nat || '').toUpperCase().trim();
  if (n === 'EGRESO') return 'EGRESO';
  return 'INGRESO';
}

// 6. Registrar Movimiento Financiero
export const addMovimientoFinanciero = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tipo_movimiento, naturaleza, categoria, concepto, monto, forma_pago, referencia } = req.body;

    let actorUserId = (req as any).user?.id || req.body.user_id;
    if (!actorUserId) {
      const defaultUser = await prisma.user.findFirst();
      if (defaultUser) actorUserId = defaultUser.id;
    }

    if (!actorUserId) {
      return res.status(400).json({ error: 'No se encontró un usuario válido para registrar el movimiento' });
    }

    if (!tipo_movimiento || !naturaleza || !concepto || !monto) {
      return res.status(400).json({ error: 'Campos requeridos: tipo_movimiento, naturaleza, concepto, monto' });
    }

    const normTipo = normalizarTipoMovimiento(tipo_movimiento);
    const normNat = normalizarNaturaleza(naturaleza);

    // Protection against duplicate requests (Idempotency check within 5 seconds)
    const recentDuplicate = await prisma.movimientoFinanciero.findFirst({
      where: {
        expediente_id: id,
        concepto,
        monto: Number(monto),
        fecha_movimiento: { gte: new Date(Date.now() - 5000) }
      }
    });

    if (recentDuplicate) {
      return res.status(200).json(recentDuplicate);
    }

    const movimiento = await prisma.movimientoFinanciero.create({
      data: {
        expediente_id: id,
        tipo_movimiento: normTipo,
        naturaleza: normNat,
        categoria: categoria || (normNat === 'EGRESO' ? 'TERCEROS' : 'NOTARIA'),
        concepto,
        monto: Number(monto),
        forma_pago: forma_pago || 'TRANSFERENCIA',
        referencia: typeof referencia === 'object' ? JSON.stringify(referencia) : referencia,
        capturado_por_id: actorUserId,
        estatus: 'VALIDADO'
      }
    });

    await calculateExpedienteProgress(id);

    res.status(201).json(movimiento);
  } catch (error: any) {
    console.error('[addMovimientoFinanciero] Error:', error);
    res.status(500).json({
      error: 'Error al registrar movimiento financiero',
      detail: error.message,
      code: error.code || 'PRISMA_ERROR'
    });
  }
};

// 7. Reverso de Movimiento Financiero
export const reverseMovimientoFinanciero = async (req: Request, res: Response) => {
  try {
    const { id, movimientoId } = req.params;
    const { motivo_reversion } = req.body;

    if (!motivo_reversion || typeof motivo_reversion !== 'string' || !motivo_reversion.trim()) {
      return res.status(400).json({ error: 'El motivo de reverso es obligatorio' });
    }

    let actorUserId = (req as any).user?.id || req.body.user_id;
    if (!actorUserId) {
      const defaultUser = await prisma.user.findFirst();
      if (defaultUser) actorUserId = defaultUser.id;
    }

    if (!actorUserId) {
      return res.status(400).json({ error: 'No se encontró un usuario válido para la reversión' });
    }

    const original = await prisma.movimientoFinanciero.findUnique({
      where: { id: movimientoId }
    });

    if (!original) {
      return res.status(404).json({ error: 'Movimiento original no encontrado' });
    }

    if (original.estatus === 'REVERTIDO') {
      return res.status(400).json({ error: 'Este movimiento financiero ya fue revertido previamente' });
    }

    const reverso = await prisma.$transaction(async (tx) => {
      // Crear movimiento de reverso compensatorio
      const rev = await tx.movimientoFinanciero.create({
        data: {
          expediente_id: id,
          tipo_movimiento: 'DEVOLUCION',
          naturaleza: original.naturaleza === 'INGRESO' ? 'EGRESO' : 'INGRESO',
          categoria: 'REVERSO',
          concepto: `Reverso de: ${original.concepto}`,
          monto: original.monto,
          capturado_por_id: actorUserId,
          validado_por_id: actorUserId,
          fecha_validacion: new Date(),
          estatus: 'VALIDADO',
          movimiento_origen_id: original.id,
          motivo_reversion,
          revertido_por_id: actorUserId,
          fecha_reversion: new Date()
        }
      });

      // Marcar original como REVERTIDO
      await tx.movimientoFinanciero.update({
        where: { id: original.id },
        data: { estatus: 'REVERTIDO' }
      });

      // Bitácora de actividad
      await tx.expedienteActividad.create({
        data: {
          expediente_id: id,
          tipo: 'AUDITORIA',
          titulo: `Movimiento Financiero Revertido ($${original.monto})`,
          descripcion: `Motivo: ${motivo_reversion}`,
          usuario_id: actorUserId
        }
      });

      return rev;
    });

    await calculateExpedienteProgress(id);

    res.json(reverso);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al revertir movimiento financiero', detail: error.message });
  }
};

// 8. Archivar / Borrado Lógico de Expediente
export const archiveExpediente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { motivo_archivo } = req.body;
    const archived_by = (req as any).user?.id;

    const expediente = await prisma.expediente.update({
      where: { id },
      data: {
        archived_at: new Date(),
        archived_by,
        motivo_archivo
      }
    });

    res.json({ message: 'Expediente archivado exitosamente', expediente });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al archivar expediente', detail: error.message });
  }
};

// 9. Actualización de Campos de Ficha General y Presupuesto Operativo
export const updateExpedienteHeader = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      cliente_alias,
      tipo_acto_id,
      tipo_acto_nombre,
      abogado_id,
      notaria_id,
      numero_escritura,
      budget_items,
      honorarios_pravia
    } = req.body;
    
    const cleanAbogadoId = (abogado_id && String(abogado_id).trim() !== '') ? abogado_id : undefined;
    const cleanNotariaId = (notaria_id && String(notaria_id).trim() !== '') ? notaria_id : null;
    let cleanTipoActoId = (tipo_acto_id && String(tipo_acto_id).trim() !== '') ? tipo_acto_id : undefined;

    if (!cleanTipoActoId && tipo_acto_nombre) {
      const matchingTipo = await prisma.tipoActo.findFirst({
        where: { nombre: { equals: String(tipo_acto_nombre).trim(), mode: 'insensitive' } }
      });
      if (matchingTipo) cleanTipoActoId = matchingTipo.id;
    }
    
    let userId = (req as any).user?.id || cleanAbogadoId;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      if (defaultUser) userId = defaultUser.id;
    }

    const currentExp = await prisma.expediente.findUnique({ where: { id } });
    if (!currentExp) return res.status(404).json({ error: 'Expediente no encontrado' });

    const currentDatos = (currentExp.datos_operacion as any) || {};
    const newDatos = { ...currentDatos };

    if (numero_escritura !== undefined) {
      newDatos.numero_escritura = numero_escritura;
    }

    let calculatedTotalCliente: number | undefined = undefined;

    if (Array.isArray(budget_items)) {
      const totalNotaria = budget_items.reduce((sum: number, r: any) => sum + Number(r.monto || 0), 0);
      const totalPravia = Number(honorarios_pravia || 0);
      calculatedTotalCliente = totalNotaria + totalPravia;

      newDatos.presupuesto = {
        rubros: budget_items,
        honorarios_pravia: totalPravia,
        total_notaria: totalNotaria,
        total_cliente: calculatedTotalCliente
      };

      if (currentExp.cotizacion_id) {
        const cot = await prisma.cotizacion.findUnique({
          where: { id: currentExp.cotizacion_id },
          include: { versiones: { orderBy: { version: 'desc' } } }
        });
        if (cot && cot.versiones && cot.versiones.length > 0) {
          const latestVer = cot.versiones[0];
          await prisma.cotizacionVersion.update({
            where: { id: latestVer.id },
            data: {
              desglose_notaria: { rubros: budget_items },
              honorarios_pravia: totalPravia,
              total_notaria: totalNotaria,
              total_cliente: calculatedTotalCliente
            }
          });
          await prisma.cotizacion.update({
            where: { id: cot.id },
            data: {
              total_notaria: totalNotaria,
              honorarios_pravia: totalPravia,
              total_cliente: calculatedTotalCliente
            }
          });
        }
      }
    }

    const changes: string[] = [];
    if (cliente_alias && cliente_alias !== currentExp.cliente_alias) changes.push(`Nombre de Identificación: "${currentExp.cliente_alias}" → "${cliente_alias}"`);
    if (cleanTipoActoId && cleanTipoActoId !== currentExp.tipo_acto_id) changes.push(`Tipo de Acto modificado`);
    if (cleanAbogadoId && cleanAbogadoId !== currentExp.abogado_id) changes.push(`Abogado Encargado reasignado`);
    if (cleanNotariaId !== currentExp.notaria_id) changes.push(`Notaría modificada`);
    if (numero_escritura !== undefined) changes.push(`Número de Escritura actualizado`);
    if (Array.isArray(budget_items)) changes.push(`Presupuesto Operativo actualizado`);

    const updated = await prisma.$transaction(async (tx) => {
      const exp = await tx.expediente.update({
        where: { id },
        data: {
          cliente_alias: cliente_alias || undefined,
          tipo_acto_id: cleanTipoActoId,
          abogado_id: cleanAbogadoId,
          notaria_id: cleanNotariaId,
          valor_operacion: calculatedTotalCliente ?? undefined,
          datos_operacion: newDatos
        }
      });

      if (changes.length > 0 && userId) {
        await tx.expedienteActividad.create({
          data: {
            expediente_id: id,
            tipo: 'AUDITORIA',
            titulo: 'Ficha General y Presupuesto del Expediente Modificados',
            descripcion: changes.join('; '),
            usuario_id: userId
          }
        });
      }

      return exp;
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar expediente', detail: error.message });
  }
};

// 10. Agregar/Vincular Documento al Archivo del Expediente (Subida Transaccional con Rollback de Storage)
export const addExpedienteDocumento = async (req: Request, res: Response) => {
  let uploadedStorageKey: string | null = null;
  try {
    const { id } = req.params;
    const file = req.file;
    const { nombre, categoria, carpeta, observaciones } = req.body;
    
    let userId = (req as any).user?.id || req.body.user_id;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      if (defaultUser) userId = defaultUser.id;
    }

    if (!userId) {
      return res.status(400).json({ error: 'No se encontró un usuario válido para registrar la actividad documental' });
    }

    const exp = await prisma.expediente.findUnique({ where: { id } });
    if (!exp) {
      return res.status(404).json({ error: 'El expediente especificado no existe' });
    }

    if (!file) {
      return res.status(400).json({
        error: 'Se requiere seleccionar un archivo real.',
        detail: 'No se crearán registros documentales sin contenido binario porque después no pueden visualizarse ni descargarse.'
      });
    }

    const originalName = file.originalname;
    const carpetaTarget = carpeta || 'Administrativo';
    const categoriaTarget = categoria || 'PROYECTO';

    // 1. Supabase es el almacenamiento canónico; no duplicar cada carga en disco local.
    const fileBuffer = file.buffer || (file.path && fs.existsSync(file.path) ? fs.readFileSync(file.path) : null);
    if (!fileBuffer) {
      return res.status(400).json({ error: 'No se pudo procesar el contenido del archivo subido.' });
    }

    const uniqueSuffix = Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    uploadedStorageKey = `${uniqueSuffix}_${file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;

    try {
      await uploadFile(fileBuffer, uploadedStorageKey, file.mimetype);
    } catch (storageErr: any) {
      return res.status(400).json({
        error: 'Error al subir archivo al almacenamiento.',
        detail: storageErr.message || 'Falla en servicio de almacenamiento Supabase Storage'
      });
    }

    // 2. Ejecutar transacción de Base de Datos
    try {
      const result = await prisma.$transaction(async (tx) => {
        const storageKeyFinal = uploadedStorageKey as string;

        const doc = await tx.documento.create({
          data: {
            nombre_original: originalName,
            nombre_interno: storageKeyFinal,
            storage_key: storageKeyFinal,
            tipo: categoriaTarget,
            categoria: categoriaTarget,
            mime_type: file.mimetype,
            size_bytes: file.size,
            subido_por_id: userId,
            expediente_id: id,
            estatus: DocEstatus.VIGENTE,
            observaciones: observaciones || `Cargado a carpeta ${carpetaTarget}`
          }
        });

        const expDoc = await tx.expedienteDocumento.create({
          data: {
            expediente_id: id,
            documento_id: doc.id,
            tipo_vinculo: carpetaTarget,
            creado_por_id: userId,
            estatus: 'ACTIVO',
            observaciones: `Categoría: ${categoriaTarget}`
          }
        });

        // Registrar Actividad Documental Auditoría
        await tx.expedienteActividad.create({
          data: {
            expediente_id: id,
            tipo: 'DOCUMENTO',
            titulo: `Documento "${originalName}" Cargado al Archivo`,
            descripcion: `Carpeta: ${carpetaTarget} | Categoría: ${categoriaTarget} | Tamaño: ${(file.size / 1024).toFixed(1)} KB`,
            usuario_id: userId
          }
        });

        return { doc, expDoc };
      });

      return res.status(201).json({
        success: true,
        documento: {
          id: result.doc.id,
          nombre_original: result.doc.nombre_original,
          storage_key: result.doc.storage_key,
          carpeta: result.expDoc.tipo_vinculo,
          estatus: result.doc.estatus,
          expediente_documento_id: result.expDoc.id
        }
      });
    } catch (txError: any) {
      if (uploadedStorageKey) {
        await deleteFile(uploadedStorageKey).catch(() => {});
      }
      return res.status(500).json({
        error: 'No se pudo crear el registro documental.',
        detail: txError.message
      });
    }
  } catch (error: any) {
    if (uploadedStorageKey) {
      await deleteFile(uploadedStorageKey).catch(() => {});
    }
    res.status(500).json({ error: 'No se pudo vincular el documento al expediente.', detail: error.message });
  }
};

// 11. Eliminar Documento del Archivo (Soft Delete / Inactivar con Bitácora y Transacción Segura)
export const deleteExpedienteDocumento = async (req: Request, res: Response) => {
  try {
    const { id, documentoId } = req.params;
    let userId = (req as any).user?.id || req.body?.usuario_id;
    if (!userId) {
      const validUser = await prisma.user.findFirst();
      if (validUser) userId = validUser.id;
    }

    const expDoc = await prisma.expedienteDocumento.findFirst({
      where: {
        expediente_id: id,
        OR: [{ documento_id: documentoId }, { id: documentoId }],
        estatus: 'ACTIVO'
      },
      include: { documento: true }
    });

    if (expDoc) {
      await prisma.$transaction(async (tx) => {
        await tx.expedienteDocumento.update({
          where: { id: expDoc.id },
          data: {
            estatus: 'INACTIVO',
            inactivado_at: new Date(),
            inactivado_por_id: userId || null
          }
        });

        if (userId) {
          await tx.expedienteActividad.create({
            data: {
              expediente_id: id,
              tipo: 'DOCUMENTO',
              titulo: `Documento "${expDoc.documento.nombre_original}" Eliminado del Archivo`,
              descripcion: 'Documento retirado de la vista del expediente; el archivo se conserva internamente para auditoría.',
              usuario_id: userId
            }
          });
        }
      });

      return res.json({ success: true, message: 'Documento eliminado exitosamente' });
    }

    // Compatibilidad con requisitos documentales antiguos que se mostraban como archivos.
    const legacyDoc = await prisma.expedienteRequisitoDoc.findFirst({
      where: { id: documentoId, expediente_id: id }
    });
    if (!legacyDoc) return res.status(404).json({ error: 'Documento no encontrado' });

    await prisma.$transaction(async (tx) => {
      await tx.expedienteRequisitoDoc.delete({ where: { id: documentoId } });

      if (userId) {
        await tx.expedienteActividad.create({
          data: {
            expediente_id: id,
            tipo: 'DOCUMENTO',
            titulo: `Documento "${legacyDoc.nombre}" Eliminado del Archivo`,
            descripcion: 'Registro documental heredado eliminado del expediente',
            usuario_id: userId
          }
        });
      }
    });

    res.json({ success: true, message: 'Documento eliminado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar documento', detail: error.message });
  }
};

// 15. Actualizar Documento (Renombrar o Mover a Carpeta)
export const updateExpedienteDocumento = async (req: Request, res: Response) => {
  try {
    const { id, documentoId } = req.params;
    const { nombre, carpeta } = req.body;

    let userId = (req as any).user?.id || req.body.user_id;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      if (defaultUser) userId = defaultUser.id;
    }

    const expDoc = await prisma.expedienteDocumento.findFirst({
      where: {
        expediente_id: id,
        OR: [{ documento_id: documentoId }, { id: documentoId }],
        estatus: 'ACTIVO'
      },
      include: { documento: true }
    });

    if (expDoc) {
      const result = await prisma.$transaction(async (tx) => {
        const updatedDocument = nombre
          ? await tx.documento.update({
              where: { id: expDoc.documento_id },
              data: { nombre_original: nombre }
            })
          : expDoc.documento;

        const updatedLink = carpeta
          ? await tx.expedienteDocumento.update({
              where: { id: expDoc.id },
              data: { tipo_vinculo: carpeta }
            })
          : expDoc;

        if (userId) {
          await tx.expedienteActividad.create({
            data: {
              expediente_id: id,
              tipo: 'DOCUMENTO',
              titulo: `Documento "${expDoc.documento.nombre_original}" Modificado`,
              descripcion: `Nuevo Nombre: "${nombre || expDoc.documento.nombre_original}" | Carpeta: ${carpeta || expDoc.tipo_vinculo}`,
              usuario_id: userId
            }
          });
        }

        return {
          id: updatedDocument.id,
          nombre: updatedDocument.nombre_original,
          carpeta: updatedLink.tipo_vinculo
        };
      });

      return res.json({ success: true, documento: result });
    }

    const doc = await prisma.expedienteRequisitoDoc.findFirst({
      where: { id: documentoId, expediente_id: id }
    });
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

    let newObs = doc.observaciones || '';
    if (carpeta) {
      newObs = newObs.replace(/\[Carpeta: .*?\]/, `[Carpeta: ${carpeta}]`);
      if (!newObs.includes('[Carpeta:')) newObs = `[Carpeta: ${carpeta}] ${newObs}`;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.expedienteRequisitoDoc.update({
        where: { id: documentoId },
        data: {
          nombre: nombre || doc.nombre,
          observaciones: newObs
        }
      });

      if (userId) {
        await tx.expedienteActividad.create({
          data: {
            expediente_id: id,
            tipo: 'DOCUMENTO',
            titulo: `Documento "${doc.nombre}" Modificado`,
            descripcion: `Nuevo Nombre: "${nombre || doc.nombre}" | Carpeta: ${carpeta || 'Sin cambios'}`,
            usuario_id: userId
          }
        });
      }

      return updated;
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar documento', detail: error.message });
  }
};

// 16. Stream & Download para Documentos del Archivo mediante documentoId único
export const streamExpedienteDocumento = async (req: Request, res: Response) => {
  try {
    const { id, documentoId } = req.params;

    // 1. Validar el vínculo activo en ExpedienteDocumento o consultar Documento maestro
    const expDoc = await prisma.expedienteDocumento.findFirst({
      where: {
        expediente_id: id,
        OR: [{ documento_id: documentoId }, { id: documentoId }],
        estatus: 'ACTIVO'
      },
      include: { documento: true }
    });

    let doc: any = expDoc?.documento;
    if (!doc) {
      doc = await prisma.documento.findFirst({
        where: {
          id: documentoId,
          expediente_id: id,
          expedienteVinculos: { none: { expediente_id: id } }
        }
      });
    }

    if (!doc) {
      return res.status(404).json({ error: 'Documento no encontrado en el archivo del expediente' });
    }

    // 2. Buscar en almacenamiento local (uploads/)
    const docsDir = path.join(__dirname, '../../uploads/documentos');
    
    let filePath = '';
    const candidates = [
      doc.nombre_interno ? path.join(docsDir, path.basename(doc.nombre_interno)) : '',
      doc.storage_key ? path.join(docsDir, path.basename(doc.storage_key)) : ''
    ];

    for (const cand of candidates) {
      if (cand && fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        filePath = cand;
        break;
      }
    }

    const mimeType = doc.mime_type || (doc.nombre_original.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.nombre_original)}"`);

    if (filePath) {
      return fs.createReadStream(filePath).pipe(res);
    }

    // 3. Descargar desde Supabase Storage si no está en disco local
    try {
      const fileBuffer = await downloadFile(doc.storage_key || doc.nombre_interno);
      return res.send(fileBuffer);
    } catch (supaErr) {
      return res.status(404).json({ error: 'El archivo físico no se encuentra en el almacenamiento.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Error al visualizar documento', detail: error.message });
  }
};

export const downloadExpedienteDocumento = async (req: Request, res: Response) => {
  try {
    const { id, documentoId } = req.params;

    const expDoc = await prisma.expedienteDocumento.findFirst({
      where: {
        expediente_id: id,
        OR: [{ documento_id: documentoId }, { id: documentoId }],
        estatus: 'ACTIVO'
      },
      include: { documento: true }
    });

    let doc: any = expDoc?.documento;
    if (!doc) {
      doc = await prisma.documento.findFirst({
        where: {
          id: documentoId,
          expediente_id: id,
          expedienteVinculos: { none: { expediente_id: id } }
        }
      });
    }

    if (!doc) {
      return res.status(404).json({ error: 'Documento no encontrado en el archivo del expediente' });
    }

    const docsDir = path.join(__dirname, '../../uploads/documentos');

    let filePath = '';
    const candidates = [
      doc.nombre_interno ? path.join(docsDir, path.basename(doc.nombre_interno)) : '',
      doc.storage_key ? path.join(docsDir, path.basename(doc.storage_key)) : ''
    ];

    for (const cand of candidates) {
      if (cand && fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        filePath = cand;
        break;
      }
    }

    if (filePath) {
      return res.download(filePath, doc.nombre_original);
    }

    try {
      const fileBuffer = await downloadFile(doc.storage_key || doc.nombre_interno);
      res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.nombre_original)}"`);
      return res.send(fileBuffer);
    } catch (supaErr) {
      return res.status(404).json({ error: 'No fue posible descargar el archivo del almacenamiento.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'No fue posible descargar el archivo', detail: error.message });
  }
};

// 12. Eliminar Operativamente Movimiento Financiero (Sin motivo obligatorio, sin contramovimientos)
export const deleteMovimientoFinanciero = async (req: Request, res: Response) => {
  try {
    const { id, movimientoId } = req.params;
    let userId = (req as any).user?.id || req.body?.user_id;

    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      if (defaultUser) userId = defaultUser.id;
    }

    const mov = await prisma.movimientoFinanciero.findUnique({
      where: { id: movimientoId }
    });

    if (!mov) {
      return res.status(404).json({
        success: false,
        error: 'Movimiento no encontrado',
        detail: `No existe el movimiento con ID ${movimientoId}`
      });
    }

    // Marca estatus como CANCELADO (desaparece de la vista y totales, sin motivo obligatorio)
    await prisma.$transaction(async (tx) => {
      await tx.movimientoFinanciero.update({
        where: { id: movimientoId },
        data: {
          estatus: 'CANCELADO',
          revertido_por_id: userId,
          fecha_reversion: new Date()
        }
      });

      if (userId) {
        await tx.expedienteActividad.create({
          data: {
            expediente_id: id,
            tipo: 'AUDITORIA',
            titulo: `Movimiento Financiero Eliminado ($${mov.monto})`,
            descripcion: `Eliminación operativa de "${mov.concepto}" ($${mov.monto})`,
            usuario_id: userId
          }
        });
      }
    });

    await calculateExpedienteProgress(id);

    return res.status(200).json({
      success: true,
      message: 'Movimiento eliminado exitosamente'
    });
  } catch (error: any) {
    console.error('[deleteMovimientoFinanciero] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al eliminar movimiento financiero',
      detail: error.message
    });
  }
};

// 13. Administrar Adjuntos Específicos por Movimiento (Comprobante, Factura PDF, Factura XML)
export const updateMovimientoAdjunto = async (req: Request, res: Response) => {
  try {
    const { id, movimientoId } = req.params;
    const { tipo_adjunto, accion } = req.body;

    if (accion !== 'ELIMINAR') {
      return res.status(400).json({
        error: 'Acción no válida',
        detail: 'Para cargar o sustituir adjuntos debe enviarse el archivo binario al endpoint de carga.'
      });
    }

    let userId = (req as any).user?.id || req.body.user_id;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      if (defaultUser) userId = defaultUser.id;
    }

    const mov = await prisma.movimientoFinanciero.findFirst({
      where: { id: movimientoId, expediente_id: id }
    });

    if (!mov) return res.status(404).json({ error: 'Movimiento no encontrado' });

    let currentRefData: any = {};
    try {
      if (mov.referencia && mov.referencia.startsWith('{')) {
        currentRefData = JSON.parse(mov.referencia);
      } else if (mov.referencia) {
        currentRefData = { nota: mov.referencia };
      }
    } catch (e) {
      currentRefData = { nota: mov.referencia };
    }

    const updateData: any = {};
    let accionDesc = '';
    let storageKeyToDelete: string | null = null;

    if (tipo_adjunto === 'COMPROBANTE') {
      storageKeyToDelete = currentRefData.comprobante_file || mov.comprobante_url || null;
      updateData.comprobante_url = null;
      currentRefData.comprobante_nombre = null;
      currentRefData.comprobante_file = null;
      currentRefData.comprobante_mime = null;
      currentRefData.comprobante_size = null;
      accionDesc = 'Eliminado Comprobante de Pago';
    } else if (tipo_adjunto === 'FACTURA_PDF') {
      storageKeyToDelete = currentRefData.factura_pdf_file || mov.factura_url || null;
      updateData.factura_url = null;
      currentRefData.factura_pdf_nombre = null;
      currentRefData.factura_pdf_file = null;
      currentRefData.factura_pdf_mime = null;
      currentRefData.factura_pdf_size = null;
      accionDesc = 'Eliminada Factura PDF';
    } else if (tipo_adjunto === 'FACTURA_XML') {
      storageKeyToDelete = currentRefData.factura_xml_file || currentRefData.factura_xml_url || null;
      currentRefData.factura_xml_url = null;
      currentRefData.factura_xml_nombre = null;
      currentRefData.factura_xml_file = null;
      currentRefData.factura_xml_mime = null;
      currentRefData.factura_xml_size = null;
      accionDesc = 'Eliminada Factura XML';
    } else {
      return res.status(400).json({ error: 'Tipo de adjunto no válido' });
    }

    updateData.referencia = JSON.stringify(currentRefData);

    const updatedMov = await prisma.$transaction(async (tx) => {
      const result = await tx.movimientoFinanciero.update({
        where: { id: movimientoId },
        data: updateData
      });

      if (userId) {
        await tx.expedienteActividad.create({
          data: {
            expediente_id: id,
            tipo: 'DOCUMENTO',
            titulo: `Adjunto Financiero (${tipo_adjunto})`,
            descripcion: `Acción: ${accionDesc} en movimiento "${mov.concepto}" ($${mov.monto})`,
            usuario_id: userId
          }
        });
      }

      return result;
    });

    if (storageKeyToDelete) {
      if (storageKeyToDelete.startsWith('finanzas/')) {
        await deleteFile(storageKeyToDelete).catch(() => {});
      } else {
        const localPath = path.join(FINANZAS_DIR, path.basename(storageKeyToDelete));
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      }
    }

    res.json({ success: true, movimiento: updatedMov });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar adjunto financiero', detail: error.message });
  }
};





import multer from 'multer';

// Las cargas del archivo documental se envían directamente a Supabase sin
// crear una segunda copia temporal en uploads/finanzas.
export const uploadDocumentoMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

const FINANZAS_DIR = path.join(__dirname, '../../uploads/finanzas');
if (!fs.existsSync(FINANZAS_DIR)) {
  fs.mkdirSync(FINANZAS_DIR, { recursive: true });
}

export const uploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

export const uploadMovimientoAdjuntoFile = async (req: Request, res: Response) => {
  let uploadedStorageKey: string | null = null;
  try {
    const { id, movimientoId } = req.params;
    const { tipo_adjunto } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    let userId = (req as any).user?.id || req.body.user_id;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      if (defaultUser) userId = defaultUser.id;
    }

    const mov = await prisma.movimientoFinanciero.findFirst({
      where: { id: movimientoId, expediente_id: id }
    });
    if (!mov) return res.status(404).json({ error: 'Movimiento no encontrado' });

    let currentRefData: any = {};
    try {
      if (mov.referencia && mov.referencia.startsWith('{')) {
        currentRefData = JSON.parse(mov.referencia);
      } else if (mov.referencia) {
        currentRefData = { nota: mov.referencia };
      }
    } catch (e) {
      currentRefData = { nota: mov.referencia };
    }

    const cleanName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    uploadedStorageKey = `finanzas/${id}/${movimientoId}/${Date.now()}_${cleanName}`;
    await uploadFile(file.buffer, uploadedStorageKey, file.mimetype);

    let updateData: any = {};
    let accionDesc = '';
    let previousStorageKey: string | null = null;

    if (tipo_adjunto === 'COMPROBANTE') {
      previousStorageKey = currentRefData.comprobante_file || mov.comprobante_url || null;
      updateData.comprobante_url = uploadedStorageKey;
      currentRefData.comprobante_nombre = file.originalname;
      currentRefData.comprobante_file = uploadedStorageKey;
      currentRefData.comprobante_mime = file.mimetype;
      currentRefData.comprobante_size = file.size;
      accionDesc = `Cargado/Sustituido Comprobante de Pago (${file.originalname})`;
    } else if (tipo_adjunto === 'FACTURA_PDF') {
      previousStorageKey = currentRefData.factura_pdf_file || mov.factura_url || null;
      updateData.factura_url = uploadedStorageKey;
      currentRefData.factura_pdf_nombre = file.originalname;
      currentRefData.factura_pdf_file = uploadedStorageKey;
      currentRefData.factura_pdf_mime = file.mimetype;
      currentRefData.factura_pdf_size = file.size;
      accionDesc = `Cargada/Sustituida Factura PDF (${file.originalname})`;
    } else if (tipo_adjunto === 'FACTURA_XML') {
      previousStorageKey = currentRefData.factura_xml_file || currentRefData.factura_xml_url || null;
      currentRefData.factura_xml_nombre = file.originalname;
      currentRefData.factura_xml_file = uploadedStorageKey;
      currentRefData.factura_xml_url = uploadedStorageKey;
      currentRefData.factura_xml_mime = file.mimetype || 'application/xml';
      currentRefData.factura_xml_size = file.size;
      accionDesc = `Cargada/Sustituida Factura XML (${file.originalname})`;
    } else {
      await deleteFile(uploadedStorageKey).catch(() => {});
      return res.status(400).json({ error: 'Tipo de adjunto no válido' });
    }

    updateData.referencia = JSON.stringify(currentRefData);

    const updatedMov = await prisma.$transaction(async (tx) => {
      const result = await tx.movimientoFinanciero.update({
        where: { id: movimientoId },
        data: updateData
      });

      if (userId) {
        await tx.expedienteActividad.create({
          data: {
            expediente_id: id,
            tipo: 'DOCUMENTO',
            titulo: `Adjunto Financiero (${tipo_adjunto})`,
            descripcion: `${accionDesc} en movimiento "${mov.concepto}" ($${mov.monto})`,
            usuario_id: userId
          }
        });
      }

      return result;
    });

    if (previousStorageKey && previousStorageKey !== uploadedStorageKey) {
      if (previousStorageKey.startsWith('finanzas/')) {
        await deleteFile(previousStorageKey).catch(() => {});
      } else {
        const previousLocalPath = path.join(FINANZAS_DIR, path.basename(previousStorageKey));
        if (fs.existsSync(previousLocalPath)) fs.unlinkSync(previousLocalPath);
      }
    }

    res.json(updatedMov);
  } catch (error: any) {
    if (uploadedStorageKey) await deleteFile(uploadedStorageKey).catch(() => {});
    res.status(500).json({ error: 'Error al procesar carga de archivo adjunto', detail: error.message });
  }
};

export const streamMovimientoAdjunto = async (req: Request, res: Response) => {
  try {
    const { id, movimientoId, tipo } = req.params;

    const mov = await prisma.movimientoFinanciero.findFirst({
      where: { id: movimientoId, expediente_id: id }
    });
    if (!mov) return res.status(404).json({ error: 'Movimiento no encontrado' });

    let refObj: any = {};
    try {
      if (mov.referencia && mov.referencia.startsWith('{')) refObj = JSON.parse(mov.referencia);
    } catch (e) {}

    let targetFilename = '';
    let originalName = '';
    let mimeType = 'application/octet-stream';

    if (tipo === 'COMPROBANTE') {
      targetFilename = refObj.comprobante_file || mov.comprobante_url || '';
      originalName = refObj.comprobante_nombre || 'comprobante_pago.pdf';
      mimeType = refObj.comprobante_mime || (originalName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    } else if (tipo === 'FACTURA_PDF') {
      targetFilename = refObj.factura_pdf_file || mov.factura_url || '';
      originalName = refObj.factura_pdf_nombre || 'factura.pdf';
      mimeType = 'application/pdf';
    } else if (tipo === 'FACTURA_XML') {
      targetFilename = refObj.factura_xml_file || '';
      originalName = refObj.factura_xml_nombre || 'factura.xml';
      mimeType = 'application/xml; charset=utf-8';
    }

    if (!targetFilename) {
      return res.status(404).json({ error: 'El archivo no se encuentra en el almacenamiento' });
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);

    const filePath = path.join(FINANZAS_DIR, path.basename(targetFilename));
    if (fs.existsSync(filePath)) return fs.createReadStream(filePath).pipe(res);

    try {
      const fileBuffer = await downloadFile(targetFilename);
      return res.send(fileBuffer);
    } catch (storageError) {
      return res.status(404).json({ error: 'El archivo no se encuentra en el almacenamiento' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Error al visualizar archivo adjunto', detail: error.message });
  }
};

export const downloadMovimientoAdjunto = async (req: Request, res: Response) => {
  try {
    const { id, movimientoId, tipo } = req.params;

    const mov = await prisma.movimientoFinanciero.findFirst({
      where: { id: movimientoId, expediente_id: id }
    });
    if (!mov) return res.status(404).json({ error: 'Movimiento no encontrado' });

    let refObj: any = {};
    try {
      if (mov.referencia && mov.referencia.startsWith('{')) refObj = JSON.parse(mov.referencia);
    } catch (e) {}

    let targetFilename = '';
    let originalName = '';

    if (tipo === 'COMPROBANTE') {
      targetFilename = refObj.comprobante_file || mov.comprobante_url || '';
      originalName = refObj.comprobante_nombre || 'comprobante_pago.pdf';
    } else if (tipo === 'FACTURA_PDF') {
      targetFilename = refObj.factura_pdf_file || mov.factura_url || '';
      originalName = refObj.factura_pdf_nombre || 'factura.pdf';
    } else if (tipo === 'FACTURA_XML') {
      targetFilename = refObj.factura_xml_file || '';
      originalName = refObj.factura_xml_nombre || 'factura.xml';
    }

    if (!targetFilename) {
      return res.status(404).json({ error: 'No fue posible descargar el archivo' });
    }

    const filePath = path.join(FINANZAS_DIR, path.basename(targetFilename));
    if (fs.existsSync(filePath)) {
      return res.download(filePath, originalName, (err) => {
        if (err && !res.headersSent) res.status(500).json({ error: 'No fue posible descargar el archivo' });
      });
    }

    try {
      const fileBuffer = await downloadFile(targetFilename);
      res.setHeader('Content-Type', refObj[`${tipo.toLowerCase()}_mime`] || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
      return res.send(fileBuffer);
    } catch (storageError) {
      return res.status(404).json({ error: 'El archivo no se encuentra en el almacenamiento' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'No fue posible descargar el archivo', detail: error.message });
  }
};

export const getTiposActo = async (req: Request, res: Response) => {
  try {
    const tipos = await prisma.tipoActo.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });
    res.json(tipos);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener tipos de acto', detail: error.message });
  }
};
