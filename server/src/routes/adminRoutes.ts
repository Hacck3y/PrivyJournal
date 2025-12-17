import express from 'express';
import { getSystemStats, getUsersList, deleteUser } from '../controllers/adminController';
import { authenticateToken, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

// Protect all admin routes with authentication AND admin check
router.use(authenticateToken);
router.use(adminOnly);

router.get('/stats', getSystemStats);
router.get('/users', getUsersList);
router.delete('/users/:id', deleteUser);

export default router;
