import express from 'express';
import {
  getNotarias,
  getNotariaById,
  createNotaria,
  updateNotaria,
  setNotariaPredeterminada,
  deleteNotaria
} from '../controllers/notarias.controller';

const router = express.Router();

router.get('/', getNotarias);
router.get('/:id', getNotariaById);
router.post('/', createNotaria);
router.put('/:id', updateNotaria);
router.patch('/:id/predeterminada', setNotariaPredeterminada);
router.delete('/:id', deleteNotaria);

export default router;
