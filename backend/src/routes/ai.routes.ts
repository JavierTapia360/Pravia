import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';

const router = Router();
router.get('/dashboard', AIController.dashboard);
export default router;
