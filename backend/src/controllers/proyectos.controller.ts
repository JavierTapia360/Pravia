import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { downloadFile } from '../services/supabase.service';
import { analizarProyectoNotarialConOpenAI, DocumentoParaExtraccion } from '../services/openaiDocument.service';
import prisma from '../config/prisma';

const PROYECTOS_DIR = path.join(__dirname, '../../uploads/proyectos');
const REPORTES_DIR = path.join(__dirname, '../../uploads/reportes_ia');
const DOCS_DIR = path.join(__dirname, '../../uploads/documentos');

if (!fs.existsSync(PROYECTOS_DIR)) fs.mkdirSync(PROYECTOS_DIR, { recursive: true });
if (!fs.existsSync(REPORTES_DIR)) fs.mkdirSync(REPORTES_DIR, { recursive: true });
if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

// Multer Storage for Proyectos
const storageProyectos = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PROYECTOS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `proyecto_${uniqueSuffix}${ext}`);
  }
});

export const uploadProyectoMulter = multer({
  storage: storageProyectos,
  limits: { fileSize: 25 * 1024 * 1024 }
});

// In-Memory / File-Persisted Store for Proyecto Versions & IA Reports
interface ProyectoVersionRecord {
  id: string;
  expediente_id: string;
  version_numero: number;
  nombre_original: string;
  archivo_file: string;
  mime_type: string;
  size_bytes: number;
  es_vigente: boolean;
  es_version_final: boolean;
  nota_version?: string;
  cargado_por_nombre: string;
  created_at: string;
}

interface IAReportRecord {
  expediente_id: string;
  proyecto_version_id: string;
  proyecto_version_numero: number;
  nombre_reporte: string;
  archivo_reporte_file: string;
  documentos_analizados_count: number;
  documentos_totales_count: number;
  documentos_no_leidos: string[];
  observaciones: Array<{
    id: string;
    titulo: string;
    nivel_riesgo: 'ALTO' | 'MEDIO' | 'INFORMATIVO';
    dato_proyecto: string;
    dato_fuente: string;
    documento_fuente: string;
    ubicacion: string;
    tipo_discrepancia: string;
    recomendacion: string;
  }>;
  solicitado_por: string;
  created_at: string;
}

const proyectosDBPath = path.join(__dirname, '../../uploads/proyectos_db.json');

function loadProyectosState(): { versiones: ProyectoVersionRecord[]; reportes: IAReportRecord[] } {
  if (!fs.existsSync(proyectosDBPath)) {
    return { versiones: [], reportes: [] };
  }
  try {
    const raw = fs.readFileSync(proyectosDBPath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { versiones: [], reportes: [] };
  }
}

function saveProyectosState(state: { versiones: ProyectoVersionRecord[]; reportes: IAReportRecord[] }) {
  fs.writeFileSync(proyectosDBPath, JSON.stringify(state, null, 2), 'utf8');
}

// 1. GET Proyecto State for Expediente
export const getProyectoEscritura = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const state = loadProyectosState();

    const expVersiones = state.versiones.filter(v => v.expediente_id === id);
    const vigente = expVersiones.find(v => v.es_vigente) || expVersiones[0] || null;
    const historial = expVersiones
      .filter(v => !vigente || v.id !== vigente.id)
      .sort((a, b) => b.version_numero - a.version_numero);

    const reportesExp = state.reportes.filter(r => r.expediente_id === id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const ultimoReporte = reportesExp.length > 0 ? reportesExp[0] : null;

    res.json({
      vigente,
      historial,
      ultimoReporte
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar proyecto de escritura', detail: error.message });
  }
};

// 2. POST Upload New Proyecto Version
export const uploadProyectoVersion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo de proyecto' });
    }

    const docxMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (path.extname(file.originalname).toLowerCase() !== '.docx' || file.mimetype !== docxMime) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({
        error: 'Formato de proyecto no válido',
        detail: 'La nueva versión debe ser un archivo .docx real.'
      });
    }

    let userId = (req as any).user?.id || req.body.usuario_id;
    let userName = 'Usuario Sistema';

    if (userId) {
      const u = await prisma.user.findUnique({ where: { id: userId } });
      if (u) userName = `${u.nombre} ${u.apellido}`;
    } else {
      const u = await prisma.user.findFirst();
      if (u) {
        userId = u.id;
        userName = `${u.nombre} ${u.apellido}`;
      }
    }

    const state = loadProyectosState();
    const expVersiones = state.versiones.filter(v => v.expediente_id === id);
    const maxVersion = expVersiones.reduce((max, v) => Math.max(max, v.version_numero), 0);
    const newVersionNum = maxVersion + 1;

    // Mark previous as non-vigente
    state.versiones.forEach(v => {
      if (v.expediente_id === id) v.es_vigente = false;
    });

    const newVersion: ProyectoVersionRecord = {
      id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      expediente_id: id,
      version_numero: newVersionNum,
      nombre_original: `V${newVersionNum} — ${file.originalname}`,
      archivo_file: file.filename,
      mime_type: file.mimetype,
      size_bytes: file.size,
      es_vigente: true,
      es_version_final: false,
      nota_version: req.body.nota_version || `Cargada versión V${newVersionNum}`,
      cargado_por_nombre: userName,
      created_at: new Date().toISOString()
    };

    state.versiones.push(newVersion);
    saveProyectosState(state);

    // Audit activity
    if (userId) {
      await prisma.expedienteActividad.create({
        data: {
          expediente_id: id,
          tipo: 'DOCUMENTO',
          titulo: `Nueva Versión de Proyecto Cargada (V${newVersionNum})`,
          descripcion: `Archivo: "${file.originalname}" (${(file.size / 1024).toFixed(1)} KB)`,
          usuario_id: userId
        }
      });
    }

    res.status(201).json(newVersion);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al cargar versión de proyecto', detail: error.message });
  }
};

// 3. PATCH Restore version to Vigente / Rename / Mark Final
export const updateProyectoVersion = async (req: Request, res: Response) => {
  try {
    const { id, versionId } = req.params;
    const { accion, nuevo_nombre, nota_version } = req.body;

    const state = loadProyectosState();
    const version = state.versiones.find(v => v.id === versionId && v.expediente_id === id);

    if (!version) return res.status(404).json({ error: 'Versión no encontrada' });

    if (accion === 'RESTAURAR_VIGENTE') {
      state.versiones.forEach(v => {
        if (v.expediente_id === id) v.es_vigente = (v.id === versionId);
      });
    } else if (accion === 'MARCAR_FINAL') {
      version.es_version_final = true;
    } else if (accion === 'RENOMBRAR' && nuevo_nombre) {
      version.nombre_original = nuevo_nombre;
    }

    if (nota_version) version.nota_version = nota_version;

    saveProyectosState(state);
    res.json(version);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar versión', detail: error.message });
  }
};

// 4 & 5. Stream and Download Proyecto Version
export const streamProyectoVersion = async (req: Request, res: Response) => {
  try {
    const { id, versionId } = req.params;
    const state = loadProyectosState();
    const version = state.versiones.find(v => v.id === versionId && v.expediente_id === id);

    if (!version) return res.status(404).json({ error: 'Versión del proyecto no encontrada' });

    const filePath = path.join(PROYECTOS_DIR, version.archivo_file);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'El archivo físico del proyecto no existe en almacenamiento' });
    }

    res.setHeader('Content-Type', version.mime_type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(version.nombre_original)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al visualizar proyecto', detail: error.message });
  }
};

export const downloadProyectoVersion = async (req: Request, res: Response) => {
  try {
    const { id, versionId } = req.params;
    const state = loadProyectosState();
    const version = state.versiones.find(v => v.id === versionId && v.expediente_id === id);

    if (!version) return res.status(404).json({ error: 'Versión del proyecto no encontrada' });

    const filePath = path.join(PROYECTOS_DIR, version.archivo_file);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'El archivo físico del proyecto no existe en almacenamiento' });
    }

    res.download(filePath, version.nombre_original, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ error: 'Error al descargar archivo del proyecto' });
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al descargar proyecto', detail: error.message });
  }
};

// 6. ANALIZAR CON IA & GENERAR REPORTE WORD (.docx)
export const analizarProyectoConIA = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let userId = (req as any).user?.id || req.body.usuario_id;
    let userName = 'Javier Concordia';

    if (userId) {
      const u = await prisma.user.findUnique({ where: { id: userId } });
      if (u) userName = `${u.nombre} ${u.apellido}`;
    }

    const exp = await prisma.expediente.findUnique({
      where: { id },
      include: {
        tipo_acto: true,
        requisitos_docs: true,
        movimientosFinancieros: true,
        expedienteDocumentos: {
          where: { estatus: 'ACTIVO' },
          include: { documento: true }
        }
      }
    });

    if (!exp) return res.status(404).json({ error: 'Expediente no encontrado' });

    const state = loadProyectosState();
    const expVersiones = state.versiones.filter(v => v.expediente_id === id);
    const vigente = expVersiones.find(v => v.es_vigente) || expVersiones[0];

    if (!vigente) {
      return res.status(400).json({ error: 'Debe existir un proyecto vigente para ejecutar el análisis con IA' });
    }

    const docsActivos = exp.expedienteDocumentos
      .map(vinculo => vinculo.documento)
      .filter(documento => documento.estatus !== 'RECHAZADO');
    if (docsActivos.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un documento activo cargado en el expediente' });
    }

    const projectPath = path.join(PROYECTOS_DIR, vigente.archivo_file);
    if (!fs.existsSync(projectPath)) {
      return res.status(400).json({ error: 'El archivo físico del proyecto vigente no existe' });
    }

    const documentosParaIA: DocumentoParaExtraccion[] = [];
    const documentosNoDescargados: string[] = [];
    for (const documento of docsActivos) {
      try {
        const localPath = path.join(DOCS_DIR, documento.storage_key);
        const buffer = fs.existsSync(localPath)
          ? fs.readFileSync(localPath)
          : await downloadFile(documento.storage_key);
        documentosParaIA.push({
          buffer,
          mimeType: documento.mime_type,
          tipoDocumento: documento.tipo,
          documentoId: documento.id,
          nombreOriginal: documento.nombre_original
        });
      } catch {
        documentosNoDescargados.push(documento.nombre_original);
      }
    }

    if (documentosParaIA.length === 0) {
      return res.status(400).json({
        error: 'No fue posible descargar ningún documento fuente para ejecutar la revisión con IA'
      });
    }

    const resultadoIA = await analizarProyectoNotarialConOpenAI(
      {
        buffer: fs.readFileSync(projectPath),
        mimeType: vigente.mime_type,
        tipoDocumento: 'PROYECTO_ESCRITURA',
        documentoId: vigente.id,
        nombreOriginal: vigente.nombre_original
      },
      documentosParaIA
    );

    const observaciones = resultadoIA.observaciones.map((observacion, index) => ({
      id: `obs_${index + 1}`,
      titulo: `OBSERVACIÓN ${String(index + 1).padStart(2, '0')} — Riesgo ${
        observacion.nivel_riesgo === 'ALTO'
          ? 'Alto'
          : observacion.nivel_riesgo === 'MEDIO' ? 'Medio' : 'Informativo'
      }`,
      ...observacion
    }));
    const conteoAlto = observaciones.filter(o => o.nivel_riesgo === 'ALTO').length;
    const conteoMedio = observaciones.filter(o => o.nivel_riesgo === 'MEDIO').length;
    const conteoInformativo = observaciones.filter(o => o.nivel_riesgo === 'INFORMATIVO').length;
    const documentosNoLeidos = Array.from(new Set([
      ...documentosNoDescargados,
      ...resultadoIA.documentos_no_leidos
    ]));

    const reportFileName = `Observaciones_IA_Expediente_${exp.numero_pravia.replace(/[^a-zA-Z0-9]/g, '_')}_V${vigente.version_numero}.docx`;
    const reportPath = path.join(REPORTES_DIR, reportFileName);

    // Build Formatted Word .docx Report using 'docx' library
    const reportDoc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "PRAVIA OS — REPORTE DE REVISIÓN IA JURÍDICA",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Expediente: ", bold: true }),
              new TextRun({ text: `${exp.numero_pravia} (${exp.cliente_alias || 'Sin alias'})` }),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Tipo de Acto: ", bold: true }),
              new TextRun({ text: `${exp.tipo_acto?.nombre || 'Compraventa Inmobiliaria'}` }),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Versión del Proyecto Analizada: ", bold: true }),
              new TextRun({ text: `V${vigente.version_numero} — ${vigente.nombre_original}` }),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Fecha y Solicitante: ", bold: true }),
              new TextRun({ text: `${new Date().toLocaleString()} por ${userName}` }),
            ]
          }),
          new Paragraph({ text: " " }),
          new Paragraph({
            text: "RESUMEN EJECUTIVO DE DOCUMENTOS:",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `• Documentos Analizados: `, bold: true }),
              new TextRun({ text: `${documentosParaIA.length} de ${docsActivos.length} documentos procesados` }),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `• Resumen OpenAI: `, bold: true }),
              new TextRun({ text: resultadoIA.resumen_ejecutivo || 'Análisis completado.' }),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `• Observaciones Detectadas: `, bold: true }),
              new TextRun({
                text: `${observaciones.length} observaciones (${conteoAlto} Alto, ${conteoMedio} Medio, ${conteoInformativo} Informativo)`
              }),
            ]
          }),
          new Paragraph({ text: " " }),
          new Paragraph({
            text: "DETALLE DE OBSERVACIONES Y DISCREPANCIAS:",
            heading: HeadingLevel.HEADING_2,
          }),
          ...(observaciones.length > 0 ? observaciones.map(o => [
            new Paragraph({
              children: [
                new TextRun({ text: `${o.titulo}: `, bold: true, color: o.nivel_riesgo === 'ALTO' ? 'DC2626' : o.nivel_riesgo === 'MEDIO' ? 'D97706' : '2563EB' }),
                new TextRun({ text: o.tipo_discrepancia }),
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `   - Dato en Proyecto: `, bold: true }),
                new TextRun({ text: o.dato_proyecto }),
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `   - Dato en Fuente: `, bold: true }),
                new TextRun({ text: o.dato_fuente }),
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `   - Documento Origen: `, bold: true }),
                new TextRun({ text: `${o.documento_fuente} (${o.ubicacion})` }),
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `   - Recomendación Jurídica: `, bold: true }),
                new TextRun({ text: o.recomendacion }),
              ]
            }),
            new Paragraph({ text: " " })
          ]).flat() : [new Paragraph({ text: 'No se detectaron discrepancias comprobables en los documentos analizados.' })]),
          new Paragraph({
            children: [
              new TextRun({ text: "DECLARACIÓN DE AUDITORÍA: ", bold: true, italics: true }),
              new TextRun({ text: "Este reporte es una herramienta tecnológica de asistencia. No sustituye la revisión jurídica obligatoria del abogado encargado ni la autorización del Notario Público.", italics: true }),
            ]
          })
        ]
      }]
    });

    const reportBuffer = await Packer.toBuffer(reportDoc);
    fs.writeFileSync(reportPath, reportBuffer);

    const reportRecord: IAReportRecord = {
      expediente_id: id,
      proyecto_version_id: vigente.id,
      proyecto_version_numero: vigente.version_numero,
      nombre_reporte: `Observaciones IA - Expediente ${exp.numero_pravia.replace('EXP-', '')} - Proyecto V${vigente.version_numero}.docx`,
      archivo_reporte_file: reportFileName,
      documentos_analizados_count: documentosParaIA.length,
      documentos_totales_count: docsActivos.length,
      documentos_no_leidos: documentosNoLeidos,
      observaciones,
      solicitado_por: userName,
      created_at: new Date().toISOString()
    };

    state.reportes = state.reportes.filter(r => r.expediente_id !== id);
    state.reportes.push(reportRecord);
    saveProyectosState(state);

    // Audit activity
    if (userId) {
      await prisma.expedienteActividad.create({
        data: {
          expediente_id: id,
          tipo: 'DOCUMENTO',
          titulo: `Análisis de Inteligencia Artificial Ejecutado`,
          descripcion: `Proyecto V${vigente.version_numero} comparado con OpenAI contra ${documentosParaIA.length} documentos. ${observaciones.length} observaciones generadas.`,
          usuario_id: userId
        }
      });
    }

    res.status(201).json(reportRecord);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al ejecutar análisis de IA', detail: error.message });
  }
};

// 7 & 8. Stream and Download IA Report
export const streamIAReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const state = loadProyectosState();
    const reportesExp = state.reportes.filter(r => r.expediente_id === id);
    const reporte = reportesExp.length > 0 ? reportesExp[reportesExp.length - 1] : null;

    if (!reporte) return res.status(404).json({ error: 'No existe un reporte de IA para este expediente' });

    const filePath = path.join(REPORTES_DIR, reporte.archivo_reporte_file);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'El archivo físico del reporte IA no existe' });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(reporte.nombre_reporte)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al visualizar reporte IA', detail: error.message });
  }
};

export const downloadIAReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const state = loadProyectosState();
    const reportesExp = state.reportes.filter(r => r.expediente_id === id);
    const reporte = reportesExp.length > 0 ? reportesExp[reportesExp.length - 1] : null;

    if (!reporte) return res.status(404).json({ error: 'No existe un reporte de IA para este expediente' });

    const filePath = path.join(REPORTES_DIR, reporte.archivo_reporte_file);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'El archivo físico del reporte IA no existe' });
    }

    res.download(filePath, reporte.nombre_reporte, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ error: 'Error al descargar reporte de IA' });
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al descargar reporte de IA', detail: error.message });
  }
};

// 9. GENERAR Y DESCARGAR ARCHIVO ZIP POR CARPETA O VISTA GENERAL TODAS (PULL REAL BINARIES)
export const downloadCarpetaZip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const carpetaQuery = (req.query.carpeta as string) || 'Todas';

    let userId = (req as any).user?.id || req.body?.usuario_id;
    if (!userId) {
      const u = await prisma.user.findFirst();
      if (u) userId = u.id;
    }

    const exp = await prisma.expediente.findUnique({
      where: { id },
      include: {
        expedienteDocumentos: {
          where: { estatus: 'ACTIVO' },
          include: { documento: true }
        },
        requisitos_docs: true
      }
    });

    if (!exp) return res.status(404).json({ error: 'Expediente no encontrado' });

    // Map active documents from expedienteDocumentos or fallback to requisitos_docs
    const allDocs = (exp.expedienteDocumentos && exp.expedienteDocumentos.length > 0)
      ? exp.expedienteDocumentos.map((ed: any) => ({
          id: ed.documento?.id || ed.id,
          nombre: ed.documento?.nombre_original || ed.nombre,
          storage_key: ed.documento?.storage_key || ed.documento?.nombre_interno,
          carpeta: ed.tipo_vinculo || 'Administrativo'
        }))
      : (exp.requisitos_docs || []).map((rd: any) => {
          const match = rd.observaciones?.match(/\[Carpeta: (.*?)\]/);
          return {
            id: rd.id,
            nombre: rd.nombre,
            storage_key: null,
            carpeta: (match && match[1]) ? match[1] : (rd.carpeta || 'Administrativo')
          };
        });

    const getDocContent = async (storageKey: string | null, documentName: string): Promise<Buffer> => {
      if (!storageKey) {
        const missingError: any = new Error(`El documento "${documentName}" no tiene un archivo vinculado.`);
        missingError.code = 'DOCUMENTO_NO_DISPONIBLE';
        throw missingError;
      }

      const docsDir = path.join(__dirname, '../../uploads/documentos');
      const localPath = path.join(docsDir, storageKey);
      if (fs.existsSync(localPath)) return fs.readFileSync(localPath);

      try {
        return await downloadFile(storageKey);
      } catch (storageError: any) {
        const missingError: any = new Error(`No se encontró el archivo físico de "${documentName}" en el almacenamiento.`);
        missingError.code = 'DOCUMENTO_NO_DISPONIBLE';
        missingError.cause = storageError;
        throw missingError;
      }
    };

    const zip = new JSZip();
    const usedNamesInFolder: Record<string, number> = {};

    if (carpetaQuery === 'Todas') {
      const rootFolderName = `Expediente_${exp.numero_pravia.replace('EXP-', '')}`;
      const rootFolder = zip.folder(rootFolderName)!;

      for (const doc of allDocs) {
        const folderName = doc.carpeta || 'Administrativo';
        const folderZip = rootFolder.folder(folderName)!;

        let filename = path.basename(doc.nombre || `documento_${doc.id}`);
        if (!path.extname(filename)) filename = `${filename}.bin`;
        const keyName = `${folderName}_${filename}`;
        if (usedNamesInFolder[keyName]) {
          usedNamesInFolder[keyName]++;
          const ext = path.extname(filename);
          const base = path.basename(filename, ext);
          filename = `${base} (${usedNamesInFolder[keyName]})${ext || '.pdf'}`;
        } else {
          usedNamesInFolder[keyName] = 1;
        }

        const fileBuffer = await getDocContent(doc.storage_key, doc.nombre);
        folderZip.file(filename, fileBuffer);
      }

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

      if (userId) {
        await prisma.expedienteActividad.create({
          data: {
            expediente_id: id,
            tipo: 'DOCUMENTO',
            titulo: `Descarga de Expediente Completo en ZIP`,
            descripcion: `Archivo: "${rootFolderName}.zip"`,
            usuario_id: userId
          }
        });
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${rootFolderName}.zip"`);
      return res.send(zipBuffer);
    } else {
      const docsInFolder = allDocs.filter(d => (d.carpeta || 'Administrativo') === carpetaQuery);
      if (docsInFolder.length === 0) {
        return res.status(400).json({ error: `La carpeta "${carpetaQuery}" no contiene documentos activos` });
      }

      const folderZip = zip.folder(carpetaQuery)!;

      for (const doc of docsInFolder) {
        let filename = path.basename(doc.nombre || `documento_${doc.id}`);
        if (!path.extname(filename)) filename = `${filename}.bin`;
        if (usedNamesInFolder[filename]) {
          usedNamesInFolder[filename]++;
          const ext = path.extname(filename);
          const base = path.basename(filename, ext);
          filename = `${base} (${usedNamesInFolder[filename]})${ext || '.pdf'}`;
        } else {
          usedNamesInFolder[filename] = 1;
        }

        const fileBuffer = await getDocContent(doc.storage_key, doc.nombre);
        folderZip.file(filename, fileBuffer);
      }

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

      if (userId) {
        await prisma.expedienteActividad.create({
          data: {
            expediente_id: id,
            tipo: 'DOCUMENTO',
            titulo: `Descarga de Carpeta "${carpetaQuery}" en ZIP`,
            descripcion: `Contiene ${docsInFolder.length} documento(s)`,
            usuario_id: userId
          }
        });
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(carpetaQuery)}.zip"`);
      return res.send(zipBuffer);
    }
  } catch (error: any) {
    const status = error.code === 'DOCUMENTO_NO_DISPONIBLE' ? 409 : 500;
    res.status(status).json({ error: 'Error al generar archivo ZIP de la carpeta', detail: error.message });
  }
};

// 10. MATRIZ DE DATOS DETECTADOS PARA EL PROYECTO
export const getDatosDetectadosMatrix = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const exp = await prisma.expediente.findUnique({
      where: { id },
      include: {
        tipo_acto: true,
        notaria: true,
        cotizacion: {
          include: { prospecto: true }
        },
        comparecientes: {
          include: {
            caracter: true,
            compareciente: {
              include: {
                personaFisica: true,
                personaMoral: true
              }
            }
          }
        },
        expedienteDocumentos: {
          include: { documento: true }
        }
      }
    });

    if (!exp) return res.status(404).json({ error: 'Expediente no encontrado' });

    // Helper para obtener nombre legible de compareciente
    const getNombreCompareciente = (compObj: any) => {
      if (!compObj || !compObj.compareciente) return '';
      const { personaMoral, personaFisica, nombre_busqueda } = compObj.compareciente;
      if (personaMoral?.razon_social) return personaMoral.razon_social;
      if (personaFisica?.nombre_completo_calculado) return personaFisica.nombre_completo_calculado;
      return nombre_busqueda || '';
    };

    // 1. Extraer comprador real
    const compradorComp = exp.comparecientes.find(c =>
      c.caracter?.clave === 'PARTE_COMPRADORA' ||
      c.caracter?.nombre?.toUpperCase().includes('COMPRADOR')
    );
    const compradorNombre = compradorComp
      ? getNombreCompareciente(compradorComp)
      : (exp.cotizacion?.prospecto?.nombre || exp.cliente_alias || '[PENDIENTE DE CONFIRMAR]');

    const compradorFuente = compradorComp
      ? 'Compareciente Registrado en Expediente'
      : (exp.cotizacion?.prospecto ? 'Prospecto vinculado a la cotización' : 'Expediente Maestro');

    // 2. Extraer vendedor real
    const vendedorComp = exp.comparecientes.find(c =>
      c.caracter?.clave === 'PARTE_VENDEDORA' ||
      c.caracter?.nombre?.toUpperCase().includes('VENDEDOR')
    );
    const vendedorNombre = vendedorComp
      ? getNombreCompareciente(vendedorComp)
      : '[PENDIENTE DE CONFIRMAR]';

    const vendedorFuente = vendedorComp
      ? 'Compareciente Registrado en Expediente'
      : 'Falta Registrar Compareciente Vendedor';

    // 3. Documentos reales del expediente
    const predialDoc = exp.expedienteDocumentos.find(d => d.documento.nombre_original.toLowerCase().includes('predial'));
    const escDoc = exp.expedienteDocumentos.find(d => d.documento.nombre_original.toLowerCase().includes('esc'));
    const cotDoc = exp.expedienteDocumentos.find(d => d.documento.nombre_original.toLowerCase().includes('cotizacion'));

    const getDatoExtraido = (vinculo: any, claves: string[]) => {
      const datos = vinculo?.documento?.datos_extraidos;
      if (!datos || typeof datos !== 'object') return null;
      for (const clave of claves) {
        const valor = (datos as any)[clave];
        if (valor !== undefined && valor !== null && String(valor).trim()) return String(valor).trim();
      }
      return null;
    };

    const cuentaPredial = getDatoExtraido(predialDoc, ['cuenta_predial', 'cuentaPredial', 'clave_catastral']);
    const superficie = getDatoExtraido(escDoc, ['superficie_privativa', 'superficie', 'metros_cuadrados']);
    const notariaNombre = exp.notaria?.nombre || '[PENDIENTE DE ASIGNAR]';
    const tipoActoNombre = exp.tipo_acto?.nombre || exp.cotizacion?.prospecto?.tipo_acto || '[PENDIENTE DE CONFIRMAR]';
    
    const totalPrecioNum = exp.valor_operacion || exp.cotizacion?.total_cliente;
    const totalPrecioStr = totalPrecioNum
      ? `$${Number(totalPrecioNum).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
      : '[PENDIENTE DE CONFIRMAR]';

    const matrix = [
      {
        campo: 'tipo_acto',
        etiqueta: 'Tipo de Acto',
        valor_detectado: tipoActoNombre,
        fuente: 'Expediente Maestro / Prospecto',
        confianza: 'Alta',
        estatus: 'CONFIRMADO',
        obligatorio: true
      },
      {
        campo: 'notaria',
        etiqueta: 'Notaría Pública',
        valor_detectado: notariaNombre,
        fuente: exp.notaria ? 'Notaría asignada al expediente' : 'Falta asignar notaría',
        confianza: exp.notaria ? 'Alta' : 'Pendiente',
        estatus: exp.notaria ? 'CONFIRMADO' : 'PENDIENTE',
        obligatorio: true
      },
      {
        campo: 'vendedor',
        etiqueta: 'Vendedor / Transmitente',
        valor_detectado: vendedorNombre,
        fuente: vendedorFuente,
        confianza: vendedorComp ? 'Alta' : 'Pendiente',
        estatus: vendedorComp ? 'CONFIRMADO' : 'PENDIENTE',
        obligatorio: true
      },
      {
        campo: 'comprador',
        etiqueta: 'Comprador / Adquirente',
        valor_detectado: compradorNombre,
        fuente: compradorFuente,
        confianza: compradorComp ? 'Alta' : 'Pendiente',
        estatus: compradorComp ? 'CONFIRMADO' : 'PENDIENTE',
        obligatorio: true
      },
      {
        campo: 'cuenta_predial',
        etiqueta: 'Cuenta Predial',
        valor_detectado: cuentaPredial || '[PENDIENTE DE EXTRAER]',
        fuente: predialDoc ? `Documento disponible: ${predialDoc.documento.nombre_original}` : 'Falta documento predial',
        confianza: cuentaPredial ? 'Alta' : 'Pendiente',
        estatus: cuentaPredial ? 'CONFIRMADO' : 'PENDIENTE',
        obligatorio: true
      },
      {
        campo: 'superficie',
        etiqueta: 'Superficie Privativa',
        valor_detectado: superficie || '[PENDIENTE DE EXTRAER]',
        fuente: escDoc ? `Documento disponible: ${escDoc.documento.nombre_original}` : 'Falta escritura o antecedente',
        confianza: superficie ? 'Alta' : 'Pendiente',
        estatus: superficie ? 'CONFIRMADO' : 'PENDIENTE',
        obligatorio: true
      },
      {
        campo: 'precio',
        etiqueta: 'Precio de Operación',
        valor_detectado: totalPrecioStr,
        fuente: cotDoc ? `Documento: ${cotDoc.documento.nombre_original}` : 'Expediente / cotización vinculada',
        confianza: totalPrecioNum ? 'Alta' : 'Pendiente',
        estatus: totalPrecioNum ? 'CONFIRMADO' : 'PENDIENTE',
        obligatorio: true
      },
      {
        campo: 'folio_real',
        etiqueta: 'Folio Real / Registro',
        valor_detectado: '[PENDIENTE DE CONFIRMAR]',
        fuente: 'Falta Certificado de Gravamen',
        confianza: 'Pendiente',
        estatus: 'PENDIENTE',
        obligatorio: false
      },
      {
        campo: 'estado_civil',
        etiqueta: 'Estado Civil Comprador',
        valor_detectado: '[PENDIENTE DE CONFIRMAR]',
        fuente: 'Falta Identificación / Acta de Nacimiento',
        confianza: 'Pendiente',
        estatus: 'PENDIENTE',
        obligatorio: false
      }
    ];

    res.json({ expediente_id: id, numero_pravia: exp.numero_pravia, matriz: matrix });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener matriz de datos detectados', detail: error.message });
  }
};

// 11. GENERAR PROYECTO CON IA A PARTIR DE PLANTILLA PARAMETRIZADA
export const generarProyectoConIA = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { matriz_confirmada, usuario_id } = req.body;

    let userId = (req as any).user?.id || usuario_id;
    let userName = 'Abogado Responsable';
    if (userId) {
      const u = await prisma.user.findUnique({ where: { id: userId } });
      if (u) userName = u.nombre;
    } else {
      const u = await prisma.user.findFirst();
      if (u) {
        userId = u.id;
        userName = u.nombre;
      }
    }

    const exp = await prisma.expediente.findUnique({
      where: { id },
      include: { tipo_acto: true, notaria: true }
    });

    if (!exp) return res.status(404).json({ error: 'Expediente no encontrado' });

    // Map de valores confirmados
    const confirmedMap: Record<string, string> = {};
    if (Array.isArray(matriz_confirmada)) {
      matriz_confirmada.forEach((item: any) => {
        if (item.campo && item.valor_detectado) {
          confirmedMap[item.campo] = item.valor_detectado;
        }
      });
    }

    // Cargar plantilla notarial física real de 41.6 KB (~10 páginas)
    const plantillasDir = path.join(__dirname, '../../uploads/plantillas');
    const templatePath = path.join(plantillasDir, 'plantilla_compraventa_notaria4.docx');

    // Validación de Notaría Asignada (Requerimiento 6 y 8)
    const notariaAsignada = exp.notaria?.nombre || 'NOTARÍA PÚBLICA NO. 4';
    if (!notariaAsignada.includes('4') && !notariaAsignada.toLowerCase().includes('cuatro')) {
      return res.status(400).json({
        error: 'No existe una plantilla aprobada para esta Notaría y Tipo de Acto.',
        detail: `La Notaría asignada (${notariaAsignada}) no coincide con la plantilla notarial de la Notaría Pública No. 4 de Nayarit.`
      });
    }

    if (!fs.existsSync(templatePath)) {
      return res.status(400).json({
        error: 'No existe una plantilla aprobada para esta Notaría y Tipo de Acto.',
        detail: 'No se localizó el archivo maestro Word .docx en el servidor.'
      });
    }

    const state = loadProyectosState();
    const expVersiones = state.versiones.filter(v => v.expediente_id === id);
    const nextVersionNum = expVersiones.length > 0 ? Math.max(...expVersiones.map(v => v.version_numero)) + 1 : 1;

    const timestamp = Date.now();
    const newFilename = `Proyecto_${exp.numero_pravia.replace('-', '_')}_V${nextVersionNum}_IA_${timestamp}.docx`;
    const targetFilePath = path.join(PROYECTOS_DIR, newFilename);

    // Cargar copia binaria exacta del documento original de ~10 páginas
    const content = fs.readFileSync(templatePath);
    const zip = await JSZip.loadAsync(content);
    let xml = await zip.file('word/document.xml')?.async('string');

    if (!xml) {
      return res.status(500).json({ error: 'La plantilla notarial está dañada o no contiene document.xml' });
    }

    // Realizar sustitución sobre el XML manteniendo 100% de la estructura, 10 páginas, antecedente e inmutabilidad
    xml = xml.replace(/PACIFIC SOLEIL/g, confirmedMap.vendedor || '[PENDIENTE DE CONFIRMAR]');
    xml = xml.replace(/GABINO GONZALEZ MIRAMONTES/g, confirmedMap.comprador || exp.cliente_alias || '[PENDIENTE DE CONFIRMAR]');
    xml = xml.replace(/U114328/g, confirmedMap.cuenta_predial || '[PENDIENTE DE CONFIRMAR]');
    xml = xml.replace(/49\.02 m²/g, confirmedMap.superficie || '[PENDIENTE DE CONFIRMAR]');
    xml = xml.replace(/\$157,782\.25/g, confirmedMap.precio || '[PENDIENTE DE CONFIRMAR]');

    xml = xml.replace(/\{\{\s*vendedor_nombre\s*\}\}/gi, confirmedMap.vendedor || '[PENDIENTE DE CONFIRMAR]');
    xml = xml.replace(/\{\{\s*comprador_nombre\s*\}\}/gi, confirmedMap.comprador || exp.cliente_alias || '[PENDIENTE DE CONFIRMAR]');
    xml = xml.replace(/\{\{\s*inmueble_predial\s*\}\}/gi, confirmedMap.cuenta_predial || '[PENDIENTE DE CONFIRMAR]');
    xml = xml.replace(/\{\{\s*inmueble_superficie\s*\}\}/gi, confirmedMap.superficie || '[PENDIENTE DE CONFIRMAR]');
    xml = xml.replace(/\{\{\s*operacion_precio\s*\}\}/gi, confirmedMap.precio || '[PENDIENTE DE CONFIRMAR]');
    xml = xml.replace(/\{\{\s*inmueble_folio_real\s*\}\}/gi, confirmedMap.folio_real || '[PENDIENTE DE CONFIRMAR]');

    zip.file('word/document.xml', xml);
    const outBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Validación comparativa (Requerimiento 8): El resultado debe preservar la extensión (~40KB, ~10 páginas)
    if (outBuffer.byteLength < 30000) {
      return res.status(400).json({
        error: 'RECHAZADO POR VALIDACIÓN COMPARATIVA',
        detail: `El proyecto generado perdió la estructura del modelo notarial (peso generado ${outBuffer.byteLength} bytes < 30,000 bytes).`
      });
    }

    fs.writeFileSync(targetFilePath, outBuffer);

    // Desmarcar versiones vigentes anteriores
    state.versiones.forEach(v => {
      if (v.expediente_id === id) v.es_vigente = false;
    });

    const newVersion: ProyectoVersionRecord = {
      id: `ver_${timestamp}`,
      expediente_id: id,
      version_numero: nextVersionNum,
      nombre_original: `Proyecto_${exp.numero_pravia}_V${nextVersionNum}_IA.docx`,
      archivo_file: newFilename,
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size_bytes: fs.statSync(targetFilePath).size,
      es_vigente: true,
      es_version_final: false,
      nota_version: `V${nextVersionNum} — BORRADOR GENERADO CON IA – REQUIERE REVISIÓN`,
      cargado_por_nombre: `${userName} (IA Motor)`,
      created_at: new Date().toISOString()
    };

    state.versiones.push(newVersion);
    saveProyectosState(state);

    if (userId) {
      await prisma.expedienteActividad.create({
        data: {
          expediente_id: id,
          tipo: 'AUDITORIA',
          titulo: `Generado Proyecto de Escritura con IA (V${nextVersionNum})`,
          descripcion: `Proyecto V${nextVersionNum} generado a partir de plantilla notarial y matriz de datos confirmada. Estatus: BORRADOR GENERADO CON IA – REQUIERE REVISIÓN.`,
          usuario_id: userId
        }
      });
    }

    res.status(201).json({
      mensaje: 'Proyecto de Escritura generado con éxito mediante IA',
      version: newVersion
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al generar proyecto con IA', detail: error.message });
  }
};
