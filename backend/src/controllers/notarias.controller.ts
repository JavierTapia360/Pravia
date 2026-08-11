import { Request, Response } from 'express';
import prisma from '../config/prisma';

// 1. GET ALL NOTARIAS WITH SEARCH & FILTER
export const getNotarias = async (req: Request, res: Response) => {
  try {
    const { search, activa, predeterminada } = req.query;

    const whereClause: any = {
      archived_at: null
    };

    if (activa !== undefined) {
      whereClause.activa = String(activa) === 'true';
    }

    if (predeterminada !== undefined) {
      whereClause.predeterminada = String(predeterminada) === 'true';
    }

    if (search) {
      const q = String(search).trim();
      whereClause.OR = [
        { numero_notaria: { contains: q, mode: 'insensitive' } },
        { nombre: { contains: q, mode: 'insensitive' } },
        { notario_titular: { contains: q, mode: 'insensitive' } },
        { municipio: { contains: q, mode: 'insensitive' } },
        { entidad_federativa: { contains: q, mode: 'insensitive' } }
      ];
    }

    const notarias = await prisma.notaria.findMany({
      where: whereClause,
      include: {
        contactos: {
          orderBy: { created_at: 'asc' }
        },
        _count: {
          select: {
            cotizaciones: true,
            expedientes: true
          }
        }
      },
      orderBy: [
        { predeterminada: 'desc' },
        { activa: 'desc' },
        { numero_notaria: 'asc' },
        { nombre: 'asc' }
      ]
    });

    res.json(notarias);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar catálogo de notarías', detail: error.message });
  }
};

// 2. GET NOTARIA BY ID
export const getNotariaById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notaria = await prisma.notaria.findUnique({
      where: { id },
      include: {
        contactos: true,
        _count: {
          select: {
            cotizaciones: true,
            expedientes: true
          }
        }
      }
    });

    if (!notaria) {
      return res.status(404).json({ error: 'Notaría no encontrada' });
    }

    res.json(notaria);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar notaría', detail: error.message });
  }
};

// 3. CREATE NOTARIA (WITH UNIQUE RULE & SINGLE PREDECLARED DEFAULT RULE)
export const createNotaria = async (req: Request, res: Response) => {
  try {
    const {
      numero_notaria,
      nombre,
      notario_titular,
      entidad_federativa,
      municipio,
      demarcacion,
      direccion,
      codigo_postal,
      telefono,
      whatsapp,
      correo_general,
      correo_proyectos,
      pagina_web,
      horario,
      dias_atencion,
      tiempo_respuesta,
      tiempo_presupuesto,
      tiempo_firma,
      instrucciones_especiales,
      observaciones_generales,
      activa,
      predeterminada,
      color_identificador,
      tipos_acto_json,
      instituciones_json,
      municipios_atendidos_json,
      contactos
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre o denominación de la notaría es obligatorio' });
    }

    // Uniqueness check by numero_notaria + entidad_federativa + demarcacion if provided
    if (numero_notaria) {
      const existing = await prisma.notaria.findFirst({
        where: {
          numero_notaria: String(numero_notaria).trim(),
          entidad_federativa: entidad_federativa || 'Nayarit',
          demarcacion: demarcacion || null,
          archived_at: null
        }
      });
      if (existing) {
        return res.status(400).json({ error: `Ya existe la Notaría No. ${numero_notaria} en ${entidad_federativa || 'Nayarit'}` });
      }
    }

    const isDefault = Boolean(predeterminada);

    const result = await prisma.$transaction(async (tx) => {
      // If new notary is default, unset any previous default notary
      if (isDefault) {
        await tx.notaria.updateMany({
          where: { predeterminada: true },
          data: { predeterminada: false }
        });
      }

      const notaria = await tx.notaria.create({
        data: {
          numero_notaria: numero_notaria ? String(numero_notaria).trim() : null,
          nombre: nombre.trim(),
          notario_titular: notario_titular ? notario_titular.trim() : null,
          entidad_federativa: entidad_federativa || 'Nayarit',
          municipio: municipio || 'Tepic',
          demarcacion: demarcacion || null,
          direccion: direccion || null,
          codigo_postal: codigo_postal || null,
          telefono: telefono || null,
          whatsapp: whatsapp || null,
          correo_general: correo_general || null,
          correo_proyectos: correo_proyectos || null,
          pagina_web: pagina_web || null,
          horario: horario || null,
          dias_atencion: dias_atencion || null,
          tiempo_respuesta: tiempo_respuesta || null,
          tiempo_presupuesto: tiempo_presupuesto || null,
          tiempo_firma: tiempo_firma || null,
          instrucciones_especiales: instrucciones_especiales || null,
          observaciones_generales: observaciones_generales || null,
          activa: activa !== undefined ? Boolean(activa) : true,
          predeterminada: isDefault,
          color_identificador: color_identificador || '#D4AF37',
          tipos_acto_json: tipos_acto_json || [],
          instituciones_json: instituciones_json || [],
          municipios_atendidos_json: municipios_atendidos_json || []
        }
      });

      // Add linked contacts if provided
      if (contactos && Array.isArray(contactos) && contactos.length > 0) {
        for (const c of contactos) {
          if (c.nombre && c.nombre.trim()) {
            await tx.notariaContacto.create({
              data: {
                notaria_id: notaria.id,
                nombre: c.nombre.trim(),
                cargo: c.cargo || 'Gestor',
                telefono: c.telefono || null,
                whatsapp: c.whatsapp || null,
                correo: c.correo || null,
                observaciones: c.observaciones || null,
                activo: c.activo !== undefined ? Boolean(c.activo) : true
              }
            });
          }
        }
      }

      return notaria;
    });

    const fullNotaria = await prisma.notaria.findUnique({
      where: { id: result.id },
      include: { contactos: true }
    });

    res.status(201).json(fullNotaria);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al registrar notaría', detail: error.message });
  }
};

// 4. UPDATE NOTARIA
export const updateNotaria = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      numero_notaria,
      nombre,
      notario_titular,
      entidad_federativa,
      municipio,
      demarcacion,
      direccion,
      codigo_postal,
      telefono,
      whatsapp,
      correo_general,
      correo_proyectos,
      pagina_web,
      horario,
      dias_atencion,
      tiempo_respuesta,
      tiempo_presupuesto,
      tiempo_firma,
      instrucciones_especiales,
      observaciones_generales,
      activa,
      predeterminada,
      color_identificador,
      tipos_acto_json,
      instituciones_json,
      municipios_atendidos_json,
      contactos
    } = req.body;

    const existingNotaria = await prisma.notaria.findUnique({ where: { id } });
    if (!existingNotaria) {
      return res.status(404).json({ error: 'Notaría no encontrada' });
    }

    const isDefault = predeterminada !== undefined ? Boolean(predeterminada) : existingNotaria.predeterminada;

    const result = await prisma.$transaction(async (tx) => {
      // If setting as default, unset any previous default
      if (isDefault) {
        await tx.notaria.updateMany({
          where: { id: { not: id }, predeterminada: true },
          data: { predeterminada: false }
        });
      }

      const updated = await tx.notaria.update({
        where: { id },
        data: {
          numero_notaria: numero_notaria !== undefined ? (numero_notaria ? String(numero_notaria).trim() : null) : existingNotaria.numero_notaria,
          nombre: nombre ? nombre.trim() : existingNotaria.nombre,
          notario_titular: notario_titular !== undefined ? (notario_titular ? notario_titular.trim() : null) : existingNotaria.notario_titular,
          entidad_federativa: entidad_federativa || existingNotaria.entidad_federativa,
          municipio: municipio || existingNotaria.municipio,
          demarcacion: demarcacion !== undefined ? demarcacion : existingNotaria.demarcacion,
          direccion: direccion !== undefined ? direccion : existingNotaria.direccion,
          codigo_postal: codigo_postal !== undefined ? codigo_postal : existingNotaria.codigo_postal,
          telefono: telefono !== undefined ? telefono : existingNotaria.telefono,
          whatsapp: whatsapp !== undefined ? whatsapp : existingNotaria.whatsapp,
          correo_general: correo_general !== undefined ? correo_general : existingNotaria.correo_general,
          correo_proyectos: correo_proyectos !== undefined ? correo_proyectos : existingNotaria.correo_proyectos,
          pagina_web: pagina_web !== undefined ? pagina_web : existingNotaria.pagina_web,
          horario: horario !== undefined ? horario : existingNotaria.horario,
          dias_atencion: dias_atencion !== undefined ? dias_atencion : existingNotaria.dias_atencion,
          tiempo_respuesta: tiempo_respuesta !== undefined ? tiempo_respuesta : existingNotaria.tiempo_respuesta,
          tiempo_presupuesto: tiempo_presupuesto !== undefined ? tiempo_presupuesto : existingNotaria.tiempo_presupuesto,
          tiempo_firma: tiempo_firma !== undefined ? tiempo_firma : existingNotaria.tiempo_firma,
          instrucciones_especiales: instrucciones_especiales !== undefined ? instrucciones_especiales : existingNotaria.instrucciones_especiales,
          observaciones_generales: observaciones_generales !== undefined ? observaciones_generales : existingNotaria.observaciones_generales,
          activa: activa !== undefined ? Boolean(activa) : existingNotaria.activa,
          predeterminada: isDefault,
          color_identificador: color_identificador || existingNotaria.color_identificador,
          tipos_acto_json: tipos_acto_json !== undefined ? tipos_acto_json : existingNotaria.tipos_acto_json,
          instituciones_json: instituciones_json !== undefined ? instituciones_json : existingNotaria.instituciones_json,
          municipios_atendidos_json: municipios_atendidos_json !== undefined ? municipios_atendidos_json : existingNotaria.municipios_atendidos_json
        }
      });

      // Update linked contacts if provided
      if (contactos && Array.isArray(contactos)) {
        await tx.notariaContacto.deleteMany({ where: { notaria_id: id } });
        for (const c of contactos) {
          if (c.nombre && c.nombre.trim()) {
            await tx.notariaContacto.create({
              data: {
                notaria_id: id,
                nombre: c.nombre.trim(),
                cargo: c.cargo || 'Gestor',
                telefono: c.telefono || null,
                whatsapp: c.whatsapp || null,
                correo: c.correo || null,
                observaciones: c.observaciones || null,
                activo: c.activo !== undefined ? Boolean(c.activo) : true
              }
            });
          }
        }
      }

      return updated;
    });

    const fullUpdated = await prisma.notaria.findUnique({
      where: { id },
      include: { contactos: true }
    });

    res.json(fullUpdated);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar notaría', detail: error.message });
  }
};

// 5. SET PRETERMINADA
export const setNotariaPredeterminada = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notaria = await prisma.notaria.findUnique({ where: { id } });
    if (!notaria) return res.status(404).json({ error: 'Notaría no encontrada' });

    await prisma.$transaction([
      prisma.notaria.updateMany({
        where: { id: { not: id } },
        data: { predeterminada: false }
      }),
      prisma.notaria.update({
        where: { id },
        data: { predeterminada: true, activa: true }
      })
    ]);

    const updated = await prisma.notaria.findUnique({
      where: { id },
      include: { contactos: true }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al establecer notaría predeterminada', detail: error.message });
  }
};

// 6. DELETE NOTARIA (SOFT DELETE / BAJA LÓGICA IF RELATIONS EXIST)
export const deleteNotaria = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notaria = await prisma.notaria.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            cotizaciones: true,
            expedientes: true
          }
        }
      }
    });

    if (!notaria) {
      return res.status(404).json({ error: 'Notaría no encontrada' });
    }

    const hasRelations = (notaria._count.cotizaciones > 0 || notaria._count.expedientes > 0);

    if (hasRelations) {
      // Perform Soft Delete (Baja Lógica)
      await prisma.notaria.update({
        where: { id },
        data: {
          activa: false,
          predeterminada: false,
          archived_at: new Date()
        }
      });
      return res.json({ message: 'Notaría inactivada y dada de baja lógica preservando cotizaciones y expedientes vinculados' });
    } else {
      // Safe Hard Delete if no relations exist
      await prisma.notaria.delete({ where: { id } });
      return res.json({ message: 'Notaría eliminada exitosamente' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar notaría', detail: error.message });
  }
};
