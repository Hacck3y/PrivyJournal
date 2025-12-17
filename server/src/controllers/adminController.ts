import { Request, Response } from 'express';
import { getDb } from '../config/db';

export const getSystemStats = async (req: Request, res: Response) => {
    try {
        const db = getDb();

        // Helper to get count
        const getCount = async (table: string) => {
            const result = await db.get<{ count: number }>(`SELECT COUNT(*) as count FROM ${table}`);
            return result?.count || 0;
        };

        const totalUsers = await getCount('users');
        const totalEntries = await getCount('entries');
        const totalHabits = await getCount('habits');
        const totalNotes = await getCount('quick_notes');

        // Estimate DB size (rough approximation based on character counts)
        // This is a naive estimation but serves the purpose for a simple dashboard
        const entriesSize = await db.get<{ size: number }>('SELECT SUM(LENGTH(content)) as size FROM entries');
        const notesSize = await db.get<{ size: number }>('SELECT SUM(LENGTH(content)) as size FROM quick_notes');

        const totalSizeBytes = (entriesSize?.size || 0) + (notesSize?.size || 0);
        const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);

        res.json({
            users: totalUsers,
            entries: totalEntries,
            habits: totalHabits,
            notes: totalNotes,
            storageMB: totalSizeMB
        });
    } catch (error) {
        console.error('Error fetching system stats:', error);
        res.status(500).json({ error: 'Failed to fetch system stats' });
    }
};

export const getUsersList = async (req: Request, res: Response) => {
    try {
        const db = getDb();

        // Get users with entry counts
        const users = await db.all(`
            SELECT 
                u.id, 
                u.username, 
                COUNT(DISTINCT e.id) as entry_count,
                (SELECT COUNT(*) FROM quick_notes WHERE user_id = u.id) as note_count,
                 MAX(e.created_at) as last_active
            FROM users u
            LEFT JOIN entries e ON u.id = e.user_id
            GROUP BY u.id
        `);

        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user?.id;

    // Prevent admin from deleting themselves
    if (userId === currentUserId) {
        return res.status(400).json({ error: 'You cannot delete your own account from the admin panel' });
    }

    try {
        const db = getDb();

        // SQLite with Foreign Keys ON DELETE CASCADE would handle this automatically,
        // but let's be explicit to ensure cleanup if cascades aren't fully enabled

        await db.run('BEGIN TRANSACTION');

        await db.run('DELETE FROM habit_logs WHERE user_id = ?', userId);
        await db.run('DELETE FROM habits WHERE user_id = ?', userId);
        await db.run('DELETE FROM entries WHERE user_id = ?', userId);
        await db.run('DELETE FROM quick_notes WHERE user_id = ?', userId);
        await db.run('DELETE FROM users WHERE id = ?', userId);

        await db.run('COMMIT');

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        // Try to rollback
        try { await getDb().run('ROLLBACK'); } catch (e) { }

        res.status(500).json({ error: 'Failed to delete user' });
    }
};
