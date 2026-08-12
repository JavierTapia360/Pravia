import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';

const router = Router();
router.get('/assistant/tools', AIController.tools);
router.post('/assistant/tools/:tool', AIController.executeTool);
router.get('/dashboard', AIController.dashboard);
export default router;
