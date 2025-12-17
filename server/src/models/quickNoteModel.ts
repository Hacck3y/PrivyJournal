import { getDb } from '../config/db';
import { Database } from 'sqlite';

export interface QuickNote {
    id: number;
    user_id: number;
    title: string;
    content: string;
    color: string;
    pinned: number;
    tags: string; // JSON string
    type: 'text' | 'checklist';
    position: number;
    created_at: string;
    updated_at: string;
}

class QuickNoteModel {
    private get db(): Database {
        return getDb();
    }

    async getAllNotes(userId: number): Promise<QuickNote[]> {
        return await this.db.all<QuickNote[]>(
            'SELECT * FROM quick_notes WHERE user_id = ? ORDER BY position ASC, pinned DESC, updated_at DESC',
            userId
        );
    }

    async createNote(userId: number, content: string, color: string = '#FFE066', tags: string = '[]', type: string = 'text', title: string = ''): Promise<number> {
        // Get max position to append to end
        const maxPos = await this.db.get<{ maxPos: number }>('SELECT MAX(position) as maxPos FROM quick_notes WHERE user_id = ?', userId);
        const nextPos = (maxPos?.maxPos || 0) + 1;

        const result = await this.db.run(
            'INSERT INTO quick_notes (user_id, title, content, color, tags, type, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
            userId,
            title,
            content,
            color,
            tags,
            type,
            nextPos
        );
        return result.lastID!;
    }

    async updateNote(userId: number, noteId: number, content: string, color?: string, tags?: string, type?: string, title?: string): Promise<void> {
        // Dynamic query building could be better, but fixed params for now
        let query = 'UPDATE quick_notes SET content = ?, updated_at = CURRENT_TIMESTAMP';
        const params: any[] = [content];

        if (title !== undefined) {
            query += ', title = ?';
            params.push(title);
        }
        if (color !== undefined) {
            query += ', color = ?';
            params.push(color);
        }
        if (tags !== undefined) {
            query += ', tags = ?';
            params.push(tags);
        }
        if (type !== undefined) {
            query += ', type = ?';
            params.push(type);
        }

        query += ' WHERE id = ? AND user_id = ?';
        params.push(noteId, userId);

        await this.db.run(query, ...params);
    }

    async reorderNotes(userId: number, noteIds: number[]): Promise<void> {
        // Use a transaction for safety
        await this.db.run('BEGIN TRANSACTION');
        try {
            for (let i = 0; i < noteIds.length; i++) {
                await this.db.run(
                    'UPDATE quick_notes SET position = ? WHERE id = ? AND user_id = ?',
                    i,
                    noteIds[i],
                    userId
                );
            }
            await this.db.run('COMMIT');
        } catch (error) {
            await this.db.run('ROLLBACK');
            throw error;
        }
    }

    async deleteNote(userId: number, noteId: number): Promise<void> {
        await this.db.run(
            'DELETE FROM quick_notes WHERE id = ? AND user_id = ?',
            noteId,
            userId
        );
    }

    async togglePin(userId: number, noteId: number): Promise<boolean> {
        const note = await this.db.get<QuickNote>(
            'SELECT pinned FROM quick_notes WHERE id = ? AND user_id = ?',
            noteId,
            userId
        );

        if (note) {
            const newPinned = note.pinned === 1 ? 0 : 1;
            await this.db.run(
                'UPDATE quick_notes SET pinned = ? WHERE id = ?',
                newPinned,
                noteId
            );
            return newPinned === 1;
        }
        return false;
    }
}

export const quickNoteModel = new QuickNoteModel();
