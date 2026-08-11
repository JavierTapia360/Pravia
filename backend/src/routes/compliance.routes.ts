import { Router } from 'express';
import { ComplianceController } from '../controllers/compliance.controller';

const router = Router();
router.get('/catalogos', ComplianceController.catalogs);
router.get('/revisiones', ComplianceController.list);
router.post('/revisiones', ComplianceController.create);
router.post('/revisiones/:id/evaluar', ComplianceController.evaluate);
router.post('/revisiones/:id/revisar', ComplianceController.review);
router.post('/revisiones/:id/evidencias', ComplianceController.addEvidence);
export default router;
