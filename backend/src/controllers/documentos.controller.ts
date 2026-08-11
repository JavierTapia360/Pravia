import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { uploadFile, getSignedUrl, deleteFile } from '../services/supabase.service';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

/**
 * Subir un documento a Supabase Storage y crear registro en DB
 */
export const uploadDocumento = async (req: Request, res: Response) => {
  let nombre_interno = '';
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No se envió ningún archivo' });
    }

    const {
      tipo,
      categoria,
      prospecto_id,
      cotizacion_id,
      expediente_id,
      compareciente_id,
      user_id,
      observaciones
    } = req.body;

    if (!tipo) {
      return res.status(400).json({ error: 'tipo de documento es requerido' });
    }

    // Resolve valid subido_por_id UUID from DB
    let validUserId = user_id;
    if (!validUserId || typeof validUserId !== 'string' || validUserId.length !== 36) {
      const defaultUser = await prisma.user.findFirst();
      if (!defaultUser) {
        return res.status(400).json({ error: 'No existe un usuario válido registrado para asignar el documento' });
      }
      validUserId = defaultUser.id;
    } else {
      const existingUser = await prisma.user.findUnique({ where: { id: validUserId } });
      if (!existingUser) {
        const defaultUser = await prisma.user.findFirst();
        if (!defaultUser) return res.status(400).json({ error: 'Usuario no encontrado' });
        validUserId = defaultUser.id;
      }
    }

    // Validate enum DocCategoria ('PROYECTO' | 'FIRMA')
    const validCategoria: 'PROYECTO' | 'FIRMA' = categoria === 'FIRMA' ? 'FIRMA' : 'PROYECTO';

    // Generate unique internal name
    const ext = path.extname(file.originalname) || '.bin';
    nombre_interno = `${uuidv4()}${ext}`;

    // Upload to Supabase Storage
    const storage_key = await uploadFile(file.buffer, nombre_interno, file.mimetype);

    const documentoData = {
      nombre_original: file.originalname,
      nombre_interno,
      tipo,
      categoria: validCategoria,
      storage_key,
      mime_type: file.mimetype,
      size_bytes: file.size,
      observaciones: observaciones || null,
      subido_por_id: validUserId,
      prospecto_id: prospecto_id || null,
      cotizacion_id: cotizacion_id || null,
      expediente_id: expediente_id || null,
      compareciente_id: compareciente_id || null,
    };

    console.log('DOCUMENTO DATA:', documentoData);

    try {
      // Save metadata in DB
      const documento = await prisma.documento.create({
        data: documentoData,
        include: {
          subido_por: { select: { nombre: true } }
        }
      });

      res.status(201).json(documento);
    } catch (dbError: any) {
      console.error('DOCUMENTO CREATE ERROR');
      console.error(dbError);
      console.error(JSON.stringify(dbError, null, 2));

      // Clean up orphan file from Supabase Storage
      if (nombre_interno) {
        await deleteFile(nombre_interno).catch(delErr => console.error('Error al limpiar archivo huérfano:', delErr));
      }

      res.status(500).json({ error: 'No se pudo registrar el presupuesto. El archivo no fue guardado. Intenta nuevamente.' });
    }
  } catch (error: any) {
    console.error('Error en uploadDocumento:', error);
    res.status(500).json({ error: 'No se pudo registrar el presupuesto. El archivo no fue guardado. Intenta nuevamente.' });
  }
};

/**
 * Obtener una URL firmada temporal (2h) para un documento
 */
export const getDocumentoUrl = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const doc = await prisma.documento.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

    const url = await getSignedUrl(doc.storage_key);
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener URL del documento', detail: error.message });
  }
};

/**
 * Obtener todos los documentos de un prospecto
 */
export const getProspectoDocumentos = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const documentos = await prisma.documento.findMany({
      where: { prospecto_id: id },
      orderBy: { fecha_carga: 'desc' },
      include: { subido_por: { select: { nombre: true, id: true } } }
    });
    res.json(documentos);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar documentos', detail: error.message });
  }
};

export const desvincularDocumento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const doc = await prisma.documento.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

    // Desvincular de la cotización
    const updatedDoc = await prisma.documento.update({
      where: { id },
      data: { cotizacion_id: null }
    });

    const hasOtherRelations = Boolean(doc.prospecto_id || doc.expediente_id || doc.compareciente_id);

    res.json({
      desvinculado: true,
      documento: updatedDoc,
      hasOtherRelations,
      mensaje: hasOtherRelations 
        ? 'El documento fue desvinculado de la cotización.'
        : 'El documento fue desvinculado.'
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al desvincular el documento', detail: error.message });
  }
};

/**
 * Eliminar un documento (físico + registro DB)
 */
export const deleteDocumento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const doc = await prisma.documento.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

    const hasOtherRelations = Boolean(doc.prospecto_id || doc.expediente_id || doc.compareciente_id);

    if (hasOtherRelations && doc.cotizacion_id) {
      // Desvincular de la cotización sin borrar archivo maestro
      await prisma.documento.update({
        where: { id },
        data: { cotizacion_id: null }
      });
      res.status(200).json({ success: true, mensaje: 'Documento eliminado de la cotización.' });
    } else {
      // Eliminar archivo físico de Supabase y registro DB
      await deleteFile(doc.storage_key).catch(e => console.warn('Supabase delete warning:', e));
      await prisma.documento.delete({ where: { id } });
      res.status(200).json({ success: true, mensaje: 'Documento eliminado correctamente.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar documento', detail: error.message });
  }
};
