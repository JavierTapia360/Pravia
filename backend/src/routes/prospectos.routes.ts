import express from 'express';
import { 
  getProspectos, 
  createProspecto, 
  getProspectoById, 
  updateProspecto, 
  deleteProspecto,
  addSeguimiento
} from '../controllers/prospectos.controller';
import { getProspectoDocumentos } from '../controllers/documentos.controller';

const router = express.Router();

router.get('/', getProspectos);
router.post('/', createProspecto);
router.get('/:id', getProspectoById);
router.put('/:id', updateProspecto);
router.delete('/:id', deleteProspecto);
router.post('/:id/seguimientos', addSeguimiento);
router.get('/:id/documentos', getProspectoDocumentos);

export default router;
