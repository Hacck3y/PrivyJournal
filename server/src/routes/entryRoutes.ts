import { Router } from 'express';
import {
    getEntryByDate,
    createOrUpdateEntry,
    deleteEntry,
    getDatesWithEntries,
    searchEntries,
    getAllTags,
    getAllEntries,
    getStreak,
    getStats,
    exportEntries
} from '../controllers/entryController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// All entry routes are protected
router.use(authenticateToken);

// Entry CRUD
router.get('/entries/dates', getDatesWithEntries);
router.get('/entries/all', getAllEntries);
router.get('/entries/:date', getEntryByDate);
router.post('/entries', createOrUpdateEntry);
router.put('/entries', createOrUpdateEntry);
router.delete('/entries/:date', deleteEntry);

// Search and Tags
router.get('/search', searchEntries);
router.get('/tags', getAllTags);

// Stats and Streak
router.get('/streak', getStreak);
router.get('/stats', getStats);

// Export
router.get('/export', exportEntries);

export default router;
