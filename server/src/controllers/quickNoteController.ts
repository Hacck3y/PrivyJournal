import { Request, Response } from 'express';
import { quickNoteModel } from '../models/quickNoteModel';

export async function getAllNotes(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const notes = await quickNoteModel.getAllNotes(userId);
        res.json(notes);
    } catch (error) {
        console.error('Get notes error:', error);
        res.status(500).json({ message: 'Server error fetching notes' });
    }
}

export async function createNote(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { content, color, tags, type, title } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Note content is required' });
    }

    try {
        const noteId = await quickNoteModel.createNote(userId, content, color, JSON.stringify(tags || []), type || 'text', title || '');
        res.status(201).json({ message: 'Note created', noteId });
    } catch (error) {
        console.error('Create note error:', error);
        res.status(500).json({ message: 'Server error creating note' });
    }
}

export async function updateNote(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const noteId = parseInt(req.params.id);
    const { content, color, tags, type, title } = req.body;

    try {
        await quickNoteModel.updateNote(
            userId,
            noteId,
            content,
            color,
            tags ? JSON.stringify(tags) : undefined,
            type,
            title
        );
        res.json({ message: 'Note updated' });
    } catch (error) {
        console.error('Update note error:', error);
        res.status(500).json({ message: 'Server error updating note' });
    }
}

export async function reorderNotes(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { noteIds } = req.body; // Array of note IDs in order

    if (!Array.isArray(noteIds)) {
        return res.status(400).json({ message: 'noteIds array is required' });
    }

    try {
        await quickNoteModel.reorderNotes(userId, noteIds);
        res.json({ message: 'Notes reordered' });
    } catch (error) {
        console.error('Reorder notes error:', error);
        res.status(500).json({ message: 'Server error reordering notes' });
    }
}

export async function deleteNote(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const noteId = parseInt(req.params.id);

    try {
        await quickNoteModel.deleteNote(userId, noteId);
        res.json({ message: 'Note deleted' });
    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ message: 'Server error deleting note' });
    }
}

export async function togglePin(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const noteId = parseInt(req.params.id);

    try {
        const pinned = await quickNoteModel.togglePin(userId, noteId);
        res.json({ pinned });
    } catch (error) {
        console.error('Toggle pin error:', error);
        res.status(500).json({ message: 'Server error toggling pin' });
    }
}
