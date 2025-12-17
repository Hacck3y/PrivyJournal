import { Router } from 'express';
import {
    getAllNotes,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    reorderNotes
} from '../controllers/quickNoteController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/notes', getAllNotes);
router.post('/notes', createNote);
router.put('/notes/reorder', reorderNotes);
router.put('/notes/:id', updateNote);
router.delete('/notes/:id', deleteNote);
router.post('/notes/:id/pin', togglePin);

export default router;
