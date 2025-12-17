import { Request, Response } from 'express';
import { getDb } from '../config/db';

interface ImportData {
    entries: any[];
    habits: any[];
    habitLogs: any[];
    quickNotes: any[];
}

export async function exportData(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const db = getDb();
    try {
        const entries = await db.all('SELECT * FROM entries WHERE user_id = ?', userId);
        const habits = await db.all('SELECT * FROM habits WHERE user_id = ?', userId);
        const habitLogs = await db.all('SELECT * FROM habit_logs WHERE user_id = ?', userId);
        const quickNotes = await db.all('SELECT * FROM quick_notes WHERE user_id = ?', userId);

        // Parse tags in entries
        const parsedEntries = entries.map(entry => ({
            ...entry,
            tags: JSON.parse(entry.tags || '[]')
        }));

        const exportPayload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            data: {
                entries: parsedEntries,
                habits,
                habitLogs,
                quickNotes
            }
        };

        res.json(exportPayload);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ message: 'Server error exporting data' });
    }
}

export async function checkImportConflicts(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { data } = req.body;
    if (!data) return res.status(400).json({ message: 'No data provided' });

    const db = getDb();
    const conflicts = {
        entries: 0,
        habits: 0,
        quickNotes: 0
    };

    try {
        // Check Entries (by date)
        if (data.entries && data.entries.length > 0) {
            const dates = data.entries.map((e: any) => e.entry_date);
            // Sqlite doesn't support array parameters easily, so we loop or build query. 
            // For analysis, checking one by one is fine for reasonable size, 
            // or fetch all existing dates for user.
            const existingEntries = await db.all('SELECT entry_date FROM entries WHERE user_id = ?', userId);
            const existingDates = new Set(existingEntries.map(e => e.entry_date));

            conflicts.entries = data.entries.filter((e: any) => existingDates.has(e.entry_date)).length;
        }

        // Check Habits (by name)
        if (data.habits && data.habits.length > 0) {
            const existingHabits = await db.all('SELECT name FROM habits WHERE user_id = ?', userId);
            const existingNames = new Set(existingHabits.map(h => h.name));

            conflicts.habits = data.habits.filter((h: any) => existingNames.has(h.name)).length;
        }

        // Check Quick Notes (by exact content match to avoid dupes)
        if (data.quickNotes && data.quickNotes.length > 0) {
            const existingNotes = await db.all('SELECT content FROM quick_notes WHERE user_id = ?', userId);
            const existingContent = new Set(existingNotes.map(n => n.content));

            conflicts.quickNotes = data.quickNotes.filter((n: any) => existingContent.has(n.content)).length;
        }

        res.json({ conflicts });
    } catch (error) {
        console.error('Check conflicts error:', error);
        res.status(500).json({ message: 'Server error checking conflicts' });
    }
}

export async function executeImport(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { data, overwriteOptions } = req.body;
    // overwriteOptions: { entries: boolean, habits: boolean, quickNotes: boolean }
    if (!data) return res.status(400).json({ message: 'No data provided' });

    const db = getDb();

    // We will map old IDs to new IDs for referential integrity during this import session
    // This is crucial for habits -> habit_logs
    const habitIdMap = new Map<number, number>();

    try {
        await db.exec('BEGIN TRANSACTION');

        // 1. Process Habits first (so we can link logs)
        if (data.habits) {
            for (const habit of data.habits) {
                const existing = await db.get(
                    'SELECT id FROM habits WHERE user_id = ? AND name = ?',
                    userId, habit.name
                );

                if (existing) {
                    habitIdMap.set(habit.id, existing.id);
                    // Decide if we update color/icon?
                    if (overwriteOptions?.habits) {
                        await db.run(
                            'UPDATE habits SET icon = ?, color = ? WHERE id = ?',
                            habit.icon, habit.color, existing.id
                        );
                    }
                } else {
                    const result = await db.run(
                        'INSERT INTO habits (user_id, name, icon, color, created_at) VALUES (?, ?, ?, ?, ?)',
                        userId, habit.name, habit.icon, habit.color, habit.created_at || new Date().toISOString()
                    );
                    if (result.lastID) habitIdMap.set(habit.id, result.lastID);
                }
            }
        }

        // 2. Process Habit Logs
        if (data.habitLogs) {
            for (const log of data.habitLogs) {
                const newHabitId = habitIdMap.get(log.habit_id);
                // Only import log if we have a valid habit for it
                if (newHabitId) {
                    const existingLog = await db.get(
                        'SELECT id FROM habit_logs WHERE user_id = ? AND habit_id = ? AND log_date = ?',
                        userId, newHabitId, log.log_date
                    );

                    if (existingLog) {
                        if (overwriteOptions?.habits) { // Using habits flag for logs too as they are coupled
                            await db.run(
                                'UPDATE habit_logs SET completed = ? WHERE id = ?',
                                log.completed, existingLog.id
                            );
                        }
                    } else {
                        await db.run(
                            'INSERT INTO habit_logs (habit_id, user_id, log_date, completed) VALUES (?, ?, ?, ?)',
                            newHabitId, userId, log.log_date, log.completed
                        );
                    }
                }
            }
        }

        // 3. Process Entries
        if (data.entries) {
            for (const entry of data.entries) {
                const existing = await db.get(
                    'SELECT id FROM entries WHERE user_id = ? AND entry_date = ?',
                    userId, entry.entry_date
                );

                const tagsString = JSON.stringify(entry.tags || []);

                if (existing) {
                    if (overwriteOptions?.entries) {
                        await db.run(
                            `UPDATE entries SET content = ?, tags = ?, mood = ?, updated_at = CURRENT_TIMESTAMP 
                             WHERE id = ?`,
                            entry.content, tagsString, entry.mood, existing.id
                        );
                    }
                } else {
                    await db.run(
                        `INSERT INTO entries (user_id, entry_date, content, tags, mood, created_at, updated_at) 
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        userId, entry.entry_date, entry.content, tagsString, entry.mood,
                        entry.created_at || new Date().toISOString(),
                        entry.updated_at || new Date().toISOString()
                    );
                }
            }
        }

        // 4. Process Quick Notes
        if (data.quickNotes) {
            for (const note of data.quickNotes) {
                // If content matches, it's effectively a duplicate. 
                // But user might want to simple ADD them anyway? Unlikely they want exact text dupes.
                // If we treat "content" as ID, we only update metadata like color/pinned if it matches.
                const existing = await db.get(
                    'SELECT id FROM quick_notes WHERE user_id = ? AND content = ?',
                    userId, note.content
                );

                if (existing) {
                    if (overwriteOptions?.quickNotes) {
                        await db.run(
                            'UPDATE quick_notes SET color = ?, pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                            note.color, note.pinned, existing.id
                        );
                    }
                } else {
                    await db.run(
                        `INSERT INTO quick_notes (user_id, content, color, pinned, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        userId, note.content, note.color, note.pinned,
                        note.created_at || new Date().toISOString(),
                        note.updated_at || new Date().toISOString()
                    );
                }
            }
        }

        await db.exec('COMMIT');
        res.json({ message: 'Import completed successfully' });

    } catch (error) {
        await db.exec('ROLLBACK');
        console.error('Import execution error:', error);
        res.status(500).json({ message: 'Server error processing import' });
    }
}
