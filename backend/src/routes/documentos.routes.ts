import { Router } from 'express';
import multer from 'multer';
import { 
  uploadDocumento, 
  getDocumentoUrl, 
  deleteDocumento,
  desvincularDocumento
} from '../controllers/documentos.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('archivo'), uploadDocumento);
router.get('/:id/url', getDocumentoUrl);
router.post('/:id/desvincular', desvincularDocumento);
router.delete('/:id', deleteDocumento);

export default router;
