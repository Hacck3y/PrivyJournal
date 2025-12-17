import { getDb } from '../config/db';

export interface Entry {
    id: number;
    user_id: number;
    entry_date: string;
    content: string;
    tags: string; // JSON array
    mood: number | null; // 1-5 scale
    created_at: string;
    updated_at: string;
}

class EntryModel {
    private get db() {
        return getDb();
    }

    async getEntry(userId: number, date: string): Promise<Entry | undefined> {
        return this.db.get<Entry>(
            'SELECT * FROM entries WHERE user_id = ? AND entry_date = ?',
            userId,
            date
        );
    }

    async createOrUpdateEntry(userId: number, date: string, content: string, tags: string[] = [], mood: number | null = null): Promise<number | null> {
        const tagsJson = JSON.stringify(tags);
        const result = await this.db.run(
            `
      INSERT INTO entries (user_id, entry_date, content, tags, mood)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, entry_date) DO UPDATE SET
        content = EXCLUDED.content,
        tags = EXCLUDED.tags,
        mood = EXCLUDED.mood,
        updated_at = CURRENT_TIMESTAMP
      `,
            userId,
            date,
            content,
            tagsJson,
            mood
        );
        return result.lastID || null;
    }

    async deleteEntry(userId: number, date: string): Promise<void> {
        await this.db.run(
            'DELETE FROM entries WHERE user_id = ? AND entry_date = ?',
            userId,
            date
        );
    }

    async getDatesWithEntries(userId: number): Promise<string[]> {
        const rows = await this.db.all<{ entry_date: string }[]>(
            'SELECT DISTINCT entry_date FROM entries WHERE user_id = ? ORDER BY entry_date',
            userId
        );
        return rows.map(row => row.entry_date);
    }

    async searchEntries(userId: number, query: string, tags?: string[]): Promise<Entry[]> {
        let sql = 'SELECT * FROM entries WHERE user_id = ?';
        const params: (number | string)[] = [userId];

        // Full-text search on content
        if (query) {
            sql += ' AND content LIKE ?';
            params.push(`%${query}%`);
        }

        // Filter by tags
        if (tags && tags.length > 0) {
            tags.forEach(tag => {
                sql += ' AND tags LIKE ?';
                params.push(`%"${tag}"%`);
            });
        }

        sql += ' ORDER BY entry_date DESC LIMIT 50';

        return this.db.all<Entry[]>(sql, ...params);
    }

    async getAllTags(userId: number): Promise<string[]> {
        const rows = await this.db.all<{ tags: string }[]>(
            'SELECT tags FROM entries WHERE user_id = ? AND tags != "[]"',
            userId
        );

        const tagSet = new Set<string>();
        rows.forEach(row => {
            try {
                const tags = JSON.parse(row.tags);
                tags.forEach((tag: string) => tagSet.add(tag));
            } catch (e) {
                // Invalid JSON, skip
            }
        });

        return Array.from(tagSet).sort();
    }

    async getAllEntries(userId: number): Promise<Entry[]> {
        return this.db.all<Entry[]>(
            'SELECT * FROM entries WHERE user_id = ? ORDER BY entry_date DESC',
            userId
        );
    }

    // Calculate current writing streak
    async getStreak(userId: number): Promise<{ current: number; longest: number }> {
        const rows = await this.db.all<{ entry_date: string }[]>(
            'SELECT DISTINCT entry_date FROM entries WHERE user_id = ? ORDER BY entry_date DESC',
            userId
        );

        if (rows.length === 0) {
            return { current: 0, longest: 0 };
        }

        const dates = rows.map(r => r.entry_date);
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;

        // Calculate current streak (must include today or yesterday)
        if (dates[0] === today || dates[0] === yesterday) {
            currentStreak = 1;
            let prevDate = new Date(dates[0]);

            for (let i = 1; i < dates.length; i++) {
                const currDate = new Date(dates[i]);
                const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    currentStreak++;
                    prevDate = currDate;
                } else {
                    break;
                }
            }
        }

        // Calculate longest streak
        tempStreak = 1;
        for (let i = 0; i < dates.length - 1; i++) {
            const currDate = new Date(dates[i]);
            const nextDate = new Date(dates[i + 1]);
            const diffDays = Math.floor((currDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                tempStreak++;
            } else {
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 1;
            }
        }
        longestStreak = Math.max(longestStreak, tempStreak);

        return { current: currentStreak, longest: longestStreak };
    }

    // Get stats for insights
    async getStats(userId: number): Promise<{
        totalEntries: number;
        totalWords: number;
        avgWordsPerEntry: number;
        moodDistribution: Record<number, number>;
    }> {
        const entries = await this.getAllEntries(userId);

        let totalWords = 0;
        const moodDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        entries.forEach(entry => {
            // Count words
            const words = entry.content.trim().split(/\s+/).filter(w => w).length;
            totalWords += words;

            // Count moods
            if (entry.mood && entry.mood >= 1 && entry.mood <= 5) {
                moodDistribution[entry.mood]++;
            }
        });

        return {
            totalEntries: entries.length,
            totalWords,
            avgWordsPerEntry: entries.length > 0 ? Math.round(totalWords / entries.length) : 0,
            moodDistribution
        };
    }
}

export default new EntryModel();
