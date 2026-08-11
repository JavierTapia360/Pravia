import express from 'express';
import {
  getExpedientes,
  getExpedienteById,
  createExpediente,
  convertCotizacionToExpediente,
  transitionEstatus,
  addMovimientoFinanciero,
  reverseMovimientoFinanciero,
  updateMovimientoAdjunto,
  uploadMulter,
  uploadDocumentoMulter,
  uploadMovimientoAdjuntoFile,
  streamMovimientoAdjunto,
  downloadMovimientoAdjunto,
  archiveExpediente,
  updateExpedienteHeader,
  addExpedienteDocumento,
  deleteExpedienteDocumento,
  updateExpedienteDocumento,
  streamExpedienteDocumento,
  downloadExpedienteDocumento,
  getTiposActo
} from '../controllers/expedientes.controller';

import {
  getProyectoEscritura,
  uploadProyectoMulter,
  uploadProyectoVersion,
  updateProyectoVersion,
  streamProyectoVersion,
  downloadProyectoVersion,
  analizarProyectoConIA,
  streamIAReport,
  downloadIAReport,
  downloadCarpetaZip,
  getDatosDetectadosMatrix,
  generarProyectoConIA
} from '../controllers/proyectos.controller';

const router = express.Router();

router.get('/tipos-acto', getTiposActo);
router.get('/', getExpedientes);
router.get('/:id', getExpedienteById);
router.post('/', createExpediente);
router.patch('/:id', updateExpedienteHeader);
router.post('/convertir-cotizacion', convertCotizacionToExpediente);
router.post('/:id/transicion-estatus', transitionEstatus);

// Financial movements
router.post('/:id/movimientos', addMovimientoFinanciero);
router.post('/:id/movimientos/:movimientoId/revertir', reverseMovimientoFinanciero);
router.patch('/:id/movimientos/:movimientoId/adjunto', updateMovimientoAdjunto);
router.post('/:id/movimientos/:movimientoId/adjuntos/upload', uploadMulter.single('file'), uploadMovimientoAdjuntoFile);
router.get('/:id/movimientos/:movimientoId/adjuntos/:tipo/visualizar', streamMovimientoAdjunto);
router.get('/:id/movimientos/:movimientoId/adjuntos/:tipo/descargar', downloadMovimientoAdjunto);

// Archivo Documental & Folder ZIP Downloads
router.post('/:id/archivar', archiveExpediente);
router.get('/:id/documentos/descargar-zip', downloadCarpetaZip);
router.get('/:id/carpetas/:carpeta/zip', downloadCarpetaZip);
router.post('/:id/documentos', uploadDocumentoMulter.single('file'), addExpedienteDocumento);
router.patch('/:id/documentos/:documentoId', updateExpedienteDocumento);
router.delete('/:id/documentos/:documentoId', deleteExpedienteDocumento);
router.get('/:id/documentos/:documentoId/visualizar', streamExpedienteDocumento);
router.get('/:id/documentos/:documentoId/descargar', downloadExpedienteDocumento);

// Proyecto de Escritura & IA Analysis Reports
router.get('/:id/proyecto', getProyectoEscritura);
router.get('/:id/proyecto/matriz-datos', getDatosDetectadosMatrix);
router.post('/:id/proyecto/generar-ia', generarProyectoConIA);
router.post('/:id/proyecto/upload', uploadProyectoMulter.single('file'), uploadProyectoVersion);
router.patch('/:id/proyecto/versions/:versionId', updateProyectoVersion);
router.get('/:id/proyecto/versions/:versionId/visualizar', streamProyectoVersion);
router.get('/:id/proyecto/versions/:versionId/descargar', downloadProyectoVersion);
router.post('/:id/proyecto/analizar-ia', analizarProyectoConIA);
router.get('/:id/proyecto/reporte-ia/visualizar', streamIAReport);
router.get('/:id/proyecto/reporte-ia/descargar', downloadIAReport);

export default router;
