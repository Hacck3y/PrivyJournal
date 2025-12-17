import { Request, Response } from 'express';
import entryModel from '../models/entryModel';

export async function getEntryByDate(req: Request, res: Response) {
    const userId = req.user?.id;
    const { date } = req.params;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const entry = await entryModel.getEntry(userId, date);
        if (!entry) {
            return res.status(404).json({ message: 'Entry not found for this date' });
        }
        // Parse tags from JSON string
        const parsedEntry = {
            ...entry,
            tags: JSON.parse(entry.tags || '[]')
        };
        res.json(parsedEntry);
    } catch (error) {
        console.error('Get entry error:', error);
        res.status(500).json({ message: 'Server error fetching entry' });
    }
}

export async function createOrUpdateEntry(req: Request, res: Response) {
    const userId = req.user?.id;
    const { date, content, tags, mood } = req.body;

    if (!userId || !date || content === undefined) {
        return res.status(400).json({ message: 'User ID, date, and content are required' });
    }

    try {
        const entryId = await entryModel.createOrUpdateEntry(userId, date, content, tags || [], mood || null);
        res.status(200).json({ message: 'Entry saved successfully', entryId });
    } catch (error) {
        console.error('Save entry error:', error);
        res.status(500).json({ message: 'Server error saving entry' });
    }
}

export async function deleteEntry(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { date } = req.params;

    try {
        await entryModel.deleteEntry(userId, date);
        res.status(200).json({ message: 'Entry deleted successfully' });
    } catch (error) {
        console.error('Delete entry error:', error);
        res.status(500).json({ message: 'Server error deleting entry' });
    }
}

export async function getDatesWithEntries(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const dates = await entryModel.getDatesWithEntries(userId);
        res.json(dates);
    } catch (error) {
        console.error('Get dates error:', error);
        res.status(500).json({ message: 'Server error fetching entry dates' });
    }
}

export async function searchEntries(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { q, tags } = req.query;
    const query = typeof q === 'string' ? q : '';
    const tagList = typeof tags === 'string' ? tags.split(',').filter(t => t) : [];

    try {
        const entries = await entryModel.searchEntries(userId, query, tagList);
        // Parse tags in each entry
        const parsedEntries = entries.map(entry => ({
            ...entry,
            tags: JSON.parse(entry.tags || '[]')
        }));
        res.json(parsedEntries);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Server error searching entries' });
    }
}

export async function getAllTags(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const tags = await entryModel.getAllTags(userId);
        res.json(tags);
    } catch (error) {
        console.error('Get tags error:', error);
        res.status(500).json({ message: 'Server error fetching tags' });
    }
}

export async function getAllEntries(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const entries = await entryModel.getAllEntries(userId);
        const parsedEntries = entries.map(entry => ({
            ...entry,
            tags: JSON.parse(entry.tags || '[]')
        }));
        res.json(parsedEntries);
    } catch (error) {
        console.error('Get all entries error:', error);
        res.status(500).json({ message: 'Server error fetching entries' });
    }
}

export async function getStreak(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const streak = await entryModel.getStreak(userId);
        res.json(streak);
    } catch (error) {
        console.error('Get streak error:', error);
        res.status(500).json({ message: 'Server error fetching streak' });
    }
}

export async function getStats(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const stats = await entryModel.getStats(userId);
        res.json(stats);
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ message: 'Server error fetching stats' });
    }
}

// Export entries as JSON (frontend will convert to PDF)
export async function exportEntries(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const entries = await entryModel.getAllEntries(userId);
        const parsedEntries = entries.map(entry => ({
            ...entry,
            tags: JSON.parse(entry.tags || '[]')
        }));

        res.json({
            exportDate: new Date().toISOString(),
            totalEntries: parsedEntries.length,
            entries: parsedEntries
        });
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ message: 'Server error exporting entries' });
    }
}
