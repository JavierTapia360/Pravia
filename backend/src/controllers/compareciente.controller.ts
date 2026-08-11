import { Request, Response } from 'express';
import { ComparecienteService } from '../services/compareciente.service';
import prisma from '../config/prisma';

const comparecienteService = new ComparecienteService(prisma);

async function resolveActiveActor(req: Request, suppliedId?: string) {
  const requestedId = (req as any).user?.id || suppliedId;
  return requestedId
    ? prisma.user.findFirst({ where: { id: requestedId, activo: true }, select: { id: true } })
    : prisma.user.findFirst({ where: { activo: true }, orderBy: { created_at: 'asc' }, select: { id: true } });
}

export class ComparecienteController {
  public static async buscarDuplicados(req: Request, res: Response) {
    try {
      const { rfc, curp, nombre } = req.query;
      const resultados = await comparecienteService.buscarDuplicados({
        rfc: rfc as string,
        curp: curp as string,
        nombre: nombre as string
      });
      return res.status(200).json({ success: true, data: resultados });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async listarMaster(req: Request, res: Response) {
    try {
      const { tipo_persona, search, page, limit } = req.query;
      const result = await comparecienteService.listarMaster({
        tipo_persona: tipo_persona as any,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 25
      });
      return res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async obtenerPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await comparecienteService.obtenerPorId(id);
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(404).json({ success: false, error: err.message });
    }
  }

  public static async crearPersonaFisica(req: Request, res: Response) {
    try {
      const actor = await resolveActiveActor(req, req.body.creado_por_id);
      if (!actor) {
        return res.status(401).json({ success: false, error: 'Usuario autenticado requerido' });
      }

      const result = await comparecienteService.crearPersonaFisica({
        ...req.body,
        creado_por_id: actor.id
      });
      return res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async crearPersonaMoral(req: Request, res: Response) {
    try {
      const actor = await resolveActiveActor(req, req.body.creado_por_id);
      if (!actor) {
        return res.status(401).json({ success: false, error: 'Usuario autenticado requerido' });
      }

      const result = await comparecienteService.crearPersonaMoral({
        ...req.body,
        creado_por_id: actor.id
      });
      return res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async vincularAExpediente(req: Request, res: Response) {
    try {
      const actor = await resolveActiveActor(req, req.body.creado_por_id);
      if (!actor) {
        return res.status(401).json({ success: false, error: 'Usuario autenticado requerido' });
      }

      const vinculo = await comparecienteService.vincularAExpediente({
        ...req.body,
        creado_por_id: actor.id
      });
      return res.status(200).json({ success: true, data: vinculo });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async desvincularDeExpediente(req: Request, res: Response) {
    try {
      const { vinculoId } = req.params;
      const actor = await resolveActiveActor(req, req.body.creado_por_id);
      if (!actor) return res.status(401).json({ success: false, error: 'Usuario autenticado requerido' });
      const actualizado = await comparecienteService.desvincularDeExpediente(vinculoId, actor.id);
      return res.status(200).json({ success: true, data: actualizado });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async obtenerCatalogos(req: Request, res: Response) {
    try {
      const [caracteresCompareciente, caracteresRepresentacion] = await Promise.all([
        prisma.caracterCompareciente.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
        prisma.caracterRepresentacion.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } })
      ]);
      return res.status(200).json({
        success: true,
        data: {
          caracteresCompareciente,
          caracteresRepresentacion
        }
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async obtenerArchivoDocumental(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await comparecienteService.obtenerArchivoDocumental(id);
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async subirDocumentoMaster(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const file = req.file;
      const actor = await resolveActiveActor(req, req.body.usuario_id);
      const categoria = req.body.categoria || 'OTROS';

      if (!file) {
        return res.status(400).json({ success: false, error: 'No se recibió archivo' });
      }
      if (!actor) return res.status(401).json({ success: false, error: 'Usuario autenticado requerido' });

      const result = await comparecienteService.agregarDocumentoMaster({
        comparecienteId: id,
        userId: actor.id,
        buffer: file.buffer,
        fileName: file.originalname,
        mimeType: file.mimetype,
        categoria,
        fechaEmision: req.body.fecha_emision,
        fechaVencimiento: req.body.fecha_vencimiento,
        observaciones: req.body.observaciones,
      });

      return res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async archivarCompareciente(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const actor = await resolveActiveActor(req, req.body.usuario_id);
      const { motivo } = req.body;
      if (!actor) return res.status(401).json({ success: false, error: 'Usuario autenticado requerido' });

      const result = await comparecienteService.archivarCompareciente({
        id,
        usuario_id: actor.id,
        motivo: motivo || 'Sin motivo especificado'
      });

      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}
