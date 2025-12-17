import express from 'express';
import { exportData, checkImportConflicts, executeImport } from '../controllers/dataController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// All routes here require authentication
router.use(authenticateToken);

router.get('/export', exportData);
router.post('/import/check', checkImportConflicts);
router.post('/import/execute', executeImport);

export default router;
