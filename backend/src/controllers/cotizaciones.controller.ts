import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { CotizacionEstado } from '@prisma/client';
import { logAudit } from '../utils/auditLogger';

export const getCotizaciones = async (req: Request, res: Response) => {
  try {
    const { estado } = req.query;
    const where: any = {};
    if (estado) {
      where.estado = estado as string;
    }

    const cotizaciones = await prisma.cotizacion.findMany({
      where,
      include: {
        prospecto: { select: { nombre: true, tipo_acto: true } },
        notaria: { select: { nombre: true } },
        creada_por: { select: { nombre: true } },
        versiones: { orderBy: { version: 'desc' } },
        expediente: true
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(cotizaciones);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener cotizaciones', detail: error.message });
  }
};

export const getCotizacionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        prospecto: {
          include: {
            documentos: true
          }
        },
        notaria: true,
        versiones: { orderBy: { version: 'desc' } },
        documentos: true,
        pagos: true,
        creada_por: { select: { nombre: true } }
      }
    });

    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada' });
    const safeCotizacion = {
      ...cotizacion,
      versiones: cotizacion.versiones || [],
      documentos: cotizacion.documentos || [],
      pagos: cotizacion.pagos || []
    };
    res.json(safeCotizacion);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener cotización', detail: error.message });
  }
};

export const createCotizacion = async (req: Request, res: Response) => {
  try {
    const { prospecto_id, user_id, notaria_id } = req.body;

    if (!prospecto_id) {
      return res.status(400).json({ error: 'prospecto_id es requerido' });
    }

    const userId = user_id || (await prisma.user.findFirst())?.id;
    if (!userId) return res.status(400).json({ error: 'Usuario no encontrado' });

    // Generate consecutive number SOL-YYYY-NNN
    const year = new Date().getFullYear();
    const count = await prisma.cotizacion.count({
      where: {
        created_at: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
        }
      }
    });
    const numero_solicitud = `SOL-${year}-${String(count + 1).padStart(3, '0')}`;
    const numero_cotizacion = `COT-${year}-${String(count + 1).padStart(3, '0')}`;

    // Get prospecto info for email generation
    const prospecto = await prisma.prospecto.findUnique({
      where: { id: prospecto_id },
      include: { documentos: true }
    });

    if (!prospecto) return res.status(404).json({ error: 'Prospecto no encontrado' });

    // Generate suggested email body
    const docsList = prospecto.documentos.map(d => `- ${d.tipo || 'Documento'} (${d.nombre_original})`).join('\n') || '- No hay documentos cargados';
    const cuerpo_correo_notaria = `Buen día.

Solicitamos atentamente la cotización correspondiente al siguiente acto:

Acto:
${prospecto.tipo_acto || 'No especificado'}

Compareciente o solicitante:
${prospecto.nombre}

Se adjunta la documentación disponible para su revisión:
${docsList}

Quedamos atentos.

PRAVIA`;

    const cotizacion = await prisma.cotizacion.create({
      data: {
        numero_solicitud,
        numero_cotizacion,
        prospecto_id,
        user_id: userId,
        notaria_id,
        estado: CotizacionEstado.BORRADOR,
        cuerpo_correo_notaria
      }
    });

    await logAudit(userId, 'CREATE', 'Cotizacion', cotizacion.id, { numero_solicitud });

    res.status(201).json({
      ...cotizacion,
      versiones: [],
      documentos: [],
      pagos: []
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear cotización', detail: error.message });
  }
};

export const updateCotizacionEstado = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado, user_id } = req.body;

    const dataToUpdate: any = { estado };

    if (estado === CotizacionEstado.ENVIADA_NOTARIA) {
      dataToUpdate.fecha_solicitud_notaria = new Date();
      const limit = new Date();
      limit.setDate(limit.getDate() + 5);
      dataToUpdate.fecha_limite_respuesta_notaria = limit;
    } else if (estado === CotizacionEstado.PRESUPUESTO_RECIBIDO || estado === CotizacionEstado.EN_REVISION_ABOGADO) {
      dataToUpdate.fecha_presupuesto_recibido = new Date();
    } else if (estado === CotizacionEstado.ENVIADA_CLIENTE || estado === CotizacionEstado.EN_NEGOCIACION) {
      dataToUpdate.fecha_enviada_cliente = new Date();
    } else if (estado === CotizacionEstado.ACEPTADA) {
      dataToUpdate.fecha_aceptacion_cliente = new Date();
    } else if (estado === CotizacionEstado.CONVERTIDA_EXPEDIENTE) {
      dataToUpdate.fecha_conversion_expediente = new Date();
    }

    const cotizacion = await prisma.cotizacion.update({
      where: { id },
      data: dataToUpdate
    });

    const userId = user_id || cotizacion.user_id;
    await logAudit(userId, 'UPDATE_ESTADO', 'Cotizacion', id, { nuevo_estado: estado });

    res.json(cotizacion);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar estado', detail: error.message });
  }
};

export const createCotizacionVersion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      desglose_notaria,
      desglose_pravia,
      total_notaria,
      honorarios_pravia,
      pravia_modalidad,
      pravia_porcentaje,
      notaria_neto,
      user_id,
      notas,
      aprobada
    } = req.body;

    const cotizacion = await prisma.cotizacion.findUnique({ where: { id } });
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada' });

    const newVersionNum = cotizacion.version_actual + 1;
    const userId = user_id || cotizacion.user_id;

    // Total cliente equals total notaria (PRAVIA participation is an internal split, NOT an additive fee)
    const totalNotariaVal = Number(total_notaria || 0);
    const totalClienteVal = totalNotariaVal;
    const honorariosPraviaVal = Number(honorarios_pravia || 0);
    const notariaNetoVal = Number(notaria_neto || (totalNotariaVal - honorariosPraviaVal));

    const [version, updatedCotizacion] = await prisma.$transaction([
      prisma.cotizacionVersion.create({
        data: {
          cotizacion_id: id,
          version: newVersionNum,
          desglose_notaria,
          desglose_pravia,
          total_notaria: totalNotariaVal,
          honorarios_pravia: honorariosPraviaVal,
          total_cliente: totalClienteVal,
          creada_por_id: userId,
          aprobada: aprobada ?? false,
          notas
        }
      }),
      prisma.cotizacion.update({
        where: { id },
        data: {
          version_actual: newVersionNum,
          total_notaria: totalNotariaVal,
          honorarios_pravia: honorariosPraviaVal,
          total_cliente: totalClienteVal,
          cuerpo_correo_cliente: `Estimado(a) cliente,

Adjunto encontrará la propuesta económica de honorarios y gastos notariales para su trámite de ${cotizacion.numero_cotizacion}.

Total Presupuesto Notarial y Gastos: $${totalClienteVal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}

Quedamos a su entera disposición para cualquier duda.
Saludos cordiales,
Equipo PRAVIA OS`,
          ...(aprobada ? { fecha_aprobacion_version: new Date() } : {})
        }
      })
    ]);

    await logAudit(userId, 'CREATE_VERSION', 'Cotizacion', id, { version: newVersionNum });

    res.status(201).json({ version, cotizacion: updatedCotizacion });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear versión', detail: error.message });
  }
};

export const aprobarVersion = async (req: Request, res: Response) => {
  try {
    const { versionId } = req.params;
    const { user_id } = req.body;

    const version = await prisma.cotizacionVersion.update({
      where: { id: versionId },
      data: { aprobada: true }
    });

    await prisma.cotizacion.update({
      where: { id: version.cotizacion_id },
      data: { fecha_aprobacion_version: new Date() }
    });

    const userId = user_id || version.creada_por_id || (await prisma.user.findFirst())?.id;
    if (userId) {
      await logAudit(userId, 'APPROVE_VERSION', 'CotizacionVersion', versionId, { version: version.version });
    }

    res.json(version);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al aprobar versión', detail: error.message });
  }
};

export const extractPresupuesto = async (req: Request, res: Response) => {
  try {
    let pdfBuffer: Buffer | null = null;

    if (req.file) {
      pdfBuffer = req.file.buffer;
    } else {
      const documentoId = req.body?.documentoId || req.body?.documento_id;
      const cotizacionId = req.params?.id || req.body?.cotizacionId || req.body?.cotizacion_id;

      let doc = null;
      if (documentoId) {
        doc = await prisma.documento.findUnique({ where: { id: documentoId } });
      } else if (cotizacionId) {
        doc = await prisma.documento.findFirst({
          where: {
            cotizacion_id: cotizacionId,
            OR: [
              { tipo: 'PRESUPUESTO_NOTARIA' },
              { categoria: 'PROYECTO' }
            ]
          },
          orderBy: { fecha_carga: 'desc' }
        });
      }

      if (!doc) {
        return res.status(400).json({ error: 'No se encontró el documento PDF de presupuesto cargado para esta cotización.' });
      }

      const { downloadFile } = await import('../services/supabase.service');
      pdfBuffer = await downloadFile(doc.storage_key);
    }

    if (!pdfBuffer) {
      return res.status(400).json({ error: 'No se pudo obtener el contenido del archivo PDF' });
    }

    const { extractPresupuestoData } = await import('../services/claude.service');
    const filename = req.file?.originalname || 'Documento_Cotizacion.pdf';
    const extraction = await extractPresupuestoData(pdfBuffer, filename);
    res.json(extraction);
  } catch (error: any) {
    console.error('Error en extractPresupuesto:', error);
    res.status(500).json({ error: 'Error al extraer montos del PDF', detail: error.message });
  }
};

export const registrarAnticipo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { monto, fecha, comprobante_url, notas, user_id } = req.body;

    if (!monto || Number(monto) <= 0) {
      return res.status(400).json({ error: 'El monto del anticipo debe ser mayor a 0.' });
    }

    const pago = await prisma.pago.create({
      data: {
        cotizacion_id: id,
        categoria_ingreso: 'ANTICIPO_NOTARIA',
        concepto: 'Anticipo de cliente para trámite notarial',
        monto,
        fecha_pago: fecha ? new Date(fecha) : new Date(),
        estatus: 'RECIBIDO',
        comprobante_url,
        notas
      }
    });

    const userId = user_id || (await prisma.user.findFirst())?.id;
    if (userId) {
      await logAudit(userId, 'REGISTRAR_ANTICIPO', 'Pago', pago.id, { monto });
    }

    res.status(201).json(pago);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al registrar anticipo', detail: error.message });
  }
};

export const validarAnticipo = async (req: Request, res: Response) => {
  try {
    const { pagoId } = req.params;
    const { user_id } = req.body;

    const userId = user_id || (await prisma.user.findFirst())?.id;

    const pago = await prisma.pago.update({
      where: { id: pagoId },
      data: {
        estatus: 'VALIDADO',
        validado_por_id: userId,
        fecha_validacion: new Date()
      }
    });

    if (userId) {
      await logAudit(userId, 'VALIDAR_ANTICIPO', 'Pago', pagoId, { monto: pago.monto });
    }

    res.json(pago);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al validar anticipo por administración', detail: error.message });
  }
};

export const convertToExpediente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id, tipo_acto_id } = req.body;

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        prospecto: true,
        versiones: true,
        pagos: true
      }
    });

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // ── ACCUMULATIVE MANDATORY VALIDATIONS ──
    if (cotizacion.estado === CotizacionEstado.CONVERTIDA_EXPEDIENTE) {
      return res.status(400).json({ 
        error: 'No se puede convertir', 
        detail: 'La cotización ya fue convertida previamente a un expediente.' 
      });
    }

    if (cotizacion.estado !== CotizacionEstado.ACEPTADA) {
      return res.status(400).json({ 
        error: 'No se puede convertir', 
        detail: 'La cotización debe estar en estado ACEPTADA por el cliente.' 
      });
    }

    const hasApprovedVersion = cotizacion.versiones.some(v => v.aprobada === true);
    if (!hasApprovedVersion) {
      return res.status(400).json({ 
        error: 'No se puede convertir', 
        detail: 'Falta aprobar una versión del presupuesto (debe marcarse como aprobada).' 
      });
    }

    if (!cotizacion.prospecto_id || !cotizacion.prospecto) {
      return res.status(400).json({ 
        error: 'No se puede convertir', 
        detail: 'La cotización no tiene un prospecto válido vinculado.' 
      });
    }

    // Generate EXP number
    const year = new Date().getFullYear();
    const count = await prisma.expediente.count({
      where: {
        fecha_apertura: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
        }
      }
    });
    const numero_pravia = `EXP-${year}-${String(count + 1).padStart(3, '0')}`;
    const userId = user_id || cotizacion.user_id;

    // Transaction to create Expediente, update Documentos, Pagos and Prospecto
    const result = await prisma.$transaction(async (tx) => {
      let tipoActo = await tx.tipoActo.findFirst();
      if (!tipoActo) {
        tipoActo = await tx.tipoActo.create({
          data: { nombre: 'General / No Especificado' }
        });
      }
      const targetTipoActoId = tipo_acto_id || tipoActo.id;

      // 1. Create Expediente
      const expediente = await tx.expediente.create({
        data: {
          numero_pravia,
          tipo_acto_id: targetTipoActoId,
          abogado_id: cotizacion.user_id,
          creador_id: userId,
          cotizacion_id: cotizacion.id,
          cliente_alias: cotizacion.prospecto?.nombre || 'Cliente',
        }
      });

      // 2. Link all documents from prospecto and cotizacion to this expediente without cloning files
      await tx.documento.updateMany({
        where: {
          OR: [
            { prospecto_id: cotizacion.prospecto_id },
            { cotizacion_id: cotizacion.id }
          ]
        },
        data: { expediente_id: expediente.id }
      });

      // 3. Link all pagos from cotizacion to this expediente
      await tx.pago.updateMany({
        where: { cotizacion_id: cotizacion.id },
        data: { expediente_id: expediente.id }
      });

      // 4. Update Cotizacion and Prospecto states
      await tx.cotizacion.update({
        where: { id: cotizacion.id },
        data: { estado: CotizacionEstado.CONVERTIDA_EXPEDIENTE }
      });
      if (cotizacion.prospecto_id) {
        await tx.prospecto.update({
          where: { id: cotizacion.prospecto_id },
          data: { estado: 'ACEPTADO' }
        });
      }

      return expediente;
    });

    await logAudit(userId, 'CONVERT_TO_EXPEDIENTE', 'Cotizacion', id, { expediente_id: result.id, numero_pravia });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al convertir a expediente', detail: error.message });
  }
};

export const getCotizacionSeguimientos = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const seguimientos = await prisma.cotizacionSeguimiento.findMany({
      where: { cotizacion_id: id },
      include: { usuario: { select: { nombre: true, apellido: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.json(seguimientos);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener seguimientos', detail: error.message });
  }
};

export const createCotizacionSeguimiento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tipo, destinatario, resumen, resultado, proxima_accion, responsable, fecha_proximo_seguimiento, user_id } = req.body;

    if (!resumen) {
      return res.status(400).json({ error: 'El resumen del seguimiento es obligatorio.' });
    }

    const userId = user_id || (await prisma.user.findFirst())?.id;

    const seguimiento = await prisma.cotizacionSeguimiento.create({
      data: {
        cotizacion_id: id,
        usuario_id: userId,
        tipo: tipo || 'llamada',
        destinatario: destinatario || 'cliente',
        resumen,
        resultado: resultado || null,
        proxima_accion: proxima_accion || null,
        responsable: responsable || null,
        fecha_proximo_seguimiento: fecha_proximo_seguimiento ? new Date(fecha_proximo_seguimiento) : null
      },
      include: {
        usuario: { select: { nombre: true, apellido: true } }
      }
    });

    if (userId) {
      await logAudit(userId, 'CREATE_SEGUIMIENTO', 'CotizacionSeguimiento', seguimiento.id, { tipo, resumen });
    }

    res.status(201).json(seguimiento);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al registrar seguimiento', detail: error.message });
  }
};

export const updateParticipacionPravia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { monto, user_id } = req.body;

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: { versiones: { orderBy: { version: 'desc' }, take: 1 } }
    });

    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada' });

    const praviaMontoVal = Number(monto || 0);

    // Update Cotizacion
    const updatedCotizacion = await prisma.cotizacion.update({
      where: { id },
      data: {
        honorarios_pravia: praviaMontoVal
      }
    });

    // Update latest version if exists
    if (cotizacion.versiones.length > 0) {
      await prisma.cotizacionVersion.update({
        where: { id: cotizacion.versiones[0].id },
        data: {
          honorarios_pravia: praviaMontoVal
        }
      });
    }

    const userId = user_id || cotizacion.user_id;
    if (userId) {
      await logAudit(userId, 'UPDATE_PRAVIA_PARTICIPATION', 'Cotizacion', id, { monto: praviaMontoVal });
    }

    res.json(updatedCotizacion);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar participación PRAVIA', detail: error.message });
  }
};

// GET DOCUMENTOS DE COTIZACIÓN (HEREDA PROSPECTO SIN DUPLICAR)
export const getCotizacionDocumentos = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      select: { id: true, prospecto_id: true }
    });

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const [cDocs, cVinculos, pDocs, pVinculos] = await Promise.all([
      prisma.documento.findMany({ where: { cotizacion_id: id }, include: { subido_por: { select: { nombre: true } } } }),
      prisma.cotizacionDocumento.findMany({ where: { cotizacion_id: id, estatus: 'ACTIVO' }, include: { documento: { include: { subido_por: { select: { nombre: true } } } } } }),
      cotizacion.prospecto_id ? prisma.documento.findMany({ where: { prospecto_id: cotizacion.prospecto_id }, include: { subido_por: { select: { nombre: true } } } }) : [],
      cotizacion.prospecto_id ? prisma.prospectoDocumento.findMany({ where: { prospecto_id: cotizacion.prospecto_id, estatus: 'ACTIVO' }, include: { documento: { include: { subido_por: { select: { nombre: true } } } } } }) : []
    ]);

    const resultDocsMap = new Map<string, any>();

    // 1. Add Prospecto documents tagged as 'PROSPECTO'
    pDocs.forEach(d => {
      resultDocsMap.set(d.id, {
        ...d,
        origen_modulo: 'PROSPECTO',
        origen_etiqueta: 'Prospecto'
      });
    });

    pVinculos.forEach(v => {
      if (v.documento && !resultDocsMap.has(v.documento.id)) {
        resultDocsMap.set(v.documento.id, {
          ...v.documento,
          origen_modulo: 'PROSPECTO',
          origen_etiqueta: 'Prospecto'
        });
      }
    });

    // 2. Add Cotización documents tagged as 'COTIZACION' (overriding or appending)
    cDocs.forEach(d => {
      resultDocsMap.set(d.id, {
        ...d,
        origen_modulo: resultDocsMap.has(d.id) ? 'PROSPECTO' : 'COTIZACION',
        origen_etiqueta: resultDocsMap.has(d.id) ? 'Prospecto' : 'Cotización'
      });
    });

    cVinculos.forEach(v => {
      if (v.documento) {
        resultDocsMap.set(v.documento.id, {
          ...v.documento,
          origen_modulo: resultDocsMap.has(v.documento.id) ? 'PROSPECTO' : 'COTIZACION',
          origen_etiqueta: resultDocsMap.has(v.documento.id) ? 'Prospecto' : 'Cotización'
        });
      }
    });

    const docs = Array.from(resultDocsMap.values());
    res.json(docs);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar documentos de cotización', detail: error.message });
  }
};

// DESVINCULAR DOCUMENTO DE COTIZACIÓN (SIN BORRAR DEL PROSPECTO NI STORAGE)
export const unlinkCotizacionDocumento = async (req: Request, res: Response) => {
  try {
    const { id, documentoId } = req.params;

    // Desvincular de tabla junction CotizacionDocumento
    await prisma.cotizacionDocumento.updateMany({
      where: { cotizacion_id: id, documento_id: documentoId },
      data: { estatus: 'INACTIVO', inactivado_at: new Date() }
    });

    // Desvincular cotizacion_id directo si existe
    await prisma.documento.updateMany({
      where: { id: documentoId, cotizacion_id: id },
      data: { cotizacion_id: null }
    });

    res.json({ message: 'Documento desvinculado de la cotización exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al desvincular documento de cotización', detail: error.message });
  }
};


