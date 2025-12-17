import { Router } from 'express';
import {
    getAllHabits,
    createHabit,
    deleteHabit,
    toggleHabit,
    getHabitHistory,
    getHabitInsights
} from '../controllers/habitController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/habits', getAllHabits);
router.get('/habits/insights', getHabitInsights);
router.post('/habits', createHabit);
router.delete('/habits/:id', deleteHabit);
router.post('/habits/:id/toggle', toggleHabit);
router.get('/habits/:id/history', getHabitHistory);

export default router;
