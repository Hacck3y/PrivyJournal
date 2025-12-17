import { getDb } from '../config/db';
import { Database } from 'sqlite';

export interface Habit {
    id: number;
    user_id: number;
    name: string;
    icon: string;
    color: string;
    category: string;
    frequency_days: string; // JSON array
    target_count: number;
    created_at: string;
}

export interface HabitLog {
    id: number;
    habit_id: number;
    user_id: number;
    log_date: string;
    completed: number;
}

export interface HabitWithStatus extends Habit {
    completed_today: boolean;
    streak: number;
}

class HabitModel {
    private get db(): Database {
        return getDb();
    }

    async getAllHabits(userId: number): Promise<HabitWithStatus[]> {
        const today = new Date().toISOString().split('T')[0];

        const habits = await this.db.all<Habit[]>(
            'SELECT * FROM habits WHERE user_id = ? ORDER BY category, created_at',
            userId
        );

        const habitsWithStatus: HabitWithStatus[] = [];

        for (const habit of habits) {
            // Check if completed today
            const todayLog = await this.db.get<HabitLog>(
                'SELECT * FROM habit_logs WHERE habit_id = ? AND log_date = ?',
                habit.id,
                today
            );

            // Calculate streak (Simplified Logic for now - Strict Daily Streak)
            // TODO: Improve streak calculation based on frequency_days
            let streak = 0;
            const date = new Date();
            // If completed today, count it. If not, start check from yesterday.
            if (!todayLog || todayLog.completed !== 1) {
                date.setDate(date.getDate() - 1);
            }

            while (true) {
                const dateStr = date.toISOString().split('T')[0];
                const log = await this.db.get<HabitLog>(
                    'SELECT * FROM habit_logs WHERE habit_id = ? AND log_date = ? AND completed = 1',
                    habit.id,
                    dateStr
                );
                if (log) {
                    streak++;
                    date.setDate(date.getDate() - 1);
                } else {
                    break;
                }
            }
            // Add today back if completed
            if (todayLog && todayLog.completed === 1) {
                // streak is already including today if logic above is correct? 
                // Wait, previous logic was: check today, then loop back.
                // My new logic: Loop back from today (if completed) or yesterday (if not).
                // So streak includes today if completed.
            }


            habitsWithStatus.push({
                ...habit,
                completed_today: todayLog?.completed === 1,
                streak
            });
        }

        return habitsWithStatus;
    }

    async createHabit(userId: number, name: string, icon: string = '✅', color: string = '#8B5CF6', category: string = 'General', frequency_days: string = '[0,1,2,3,4,5,6]', target_count: number = 1): Promise<number> {
        const result = await this.db.run(
            'INSERT INTO habits (user_id, name, icon, color, category, frequency_days, target_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
            userId,
            name,
            icon,
            color,
            category,
            frequency_days,
            target_count
        );
        return result.lastID!;
    }

    async deleteHabit(userId: number, habitId: number): Promise<void> {
        await this.db.run(
            'DELETE FROM habits WHERE id = ? AND user_id = ?',
            habitId,
            userId
        );
    }

    async toggleHabit(userId: number, habitId: number, date: string): Promise<boolean> {
        // Check if log exists
        const existing = await this.db.get<HabitLog>(
            'SELECT * FROM habit_logs WHERE habit_id = ? AND log_date = ?',
            habitId,
            date
        );

        if (existing) {
            // Toggle it
            const newValue = existing.completed === 1 ? 0 : 1;
            await this.db.run(
                'UPDATE habit_logs SET completed = ? WHERE id = ?',
                newValue,
                existing.id
            );
            return newValue === 1;
        } else {
            // Create new log as completed
            await this.db.run(
                'INSERT INTO habit_logs (habit_id, user_id, log_date, completed) VALUES (?, ?, ?, 1)',
                habitId,
                userId,
                date
            );
            return true;
        }
    }

    async getHabitHistory(userId: number, habitId: number, days: number = 30): Promise<{ date: string; completed: boolean }[]> {
        const history: { date: string; completed: boolean }[] = [];
        const today = new Date();

        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const log = await this.db.get<HabitLog>(
                'SELECT * FROM habit_logs WHERE habit_id = ? AND log_date = ?',
                habitId,
                dateStr
            );

            history.push({
                date: dateStr,
                completed: log?.completed === 1
            });
        }

        return history;
    }
    async getHabitInsights(userId: number, range: string = 'month'): Promise<any> {
        const today = new Date();
        let startDate: Date | null = new Date();
        let dateQuery = '';
        const params: any[] = [userId];

        // Determine start date
        switch (range) {
            case 'today':
                // For today, we just look at the specific date
                startDate = new Date();
                dateQuery = 'AND log_date = ?';
                params.push(startDate.toISOString().split('T')[0]);
                break;
            case 'week':
                startDate.setDate(today.getDate() - 7);
                dateQuery = 'AND log_date >= ?';
                params.push(startDate.toISOString().split('T')[0]);
                break;
            case 'month':
                startDate.setDate(today.getDate() - 30);
                dateQuery = 'AND log_date >= ?';
                params.push(startDate.toISOString().split('T')[0]);
                break;
            case 'year':
                startDate.setFullYear(today.getFullYear() - 1);
                dateQuery = 'AND log_date >= ?';
                params.push(startDate.toISOString().split('T')[0]);
                break;
            case 'all':
                startDate = null;
                dateQuery = ''; // No date filter
                break;
            default:
                startDate.setDate(today.getDate() - 30);
                dateQuery = 'AND log_date >= ?';
                params.push(startDate.toISOString().split('T')[0]);
        }

        // 1. Total Completions (Filtered by range)
        const totalCompletionsResult = await this.db.get<{ count: number }>(
            `SELECT COUNT(*) as count FROM habit_logs WHERE user_id = ? AND completed = 1 ${dateQuery}`,
            ...params
        );
        const totalCompletions = totalCompletionsResult?.count || 0;

        // 2. Completion Rate per Habit (Filtered by range)
        const habits = await this.db.all<Habit[]>(
            'SELECT id, name, icon, color FROM habits WHERE user_id = ?',
            userId
        );

        const habitStats = [];
        for (const habit of habits) {
            // Need to reconstruct params for each habit query as they are specific
            const habitParams = [habit.id, userId];
            if (range !== 'all' && range !== 'today') {
                habitParams.push(params[1]); // startDate
            } else if (range === 'today') {
                habitParams.push(params[1]); // specific date
            }

            const logCount = await this.db.get<{ count: number }>(
                `SELECT COUNT(*) as count FROM habit_logs WHERE habit_id = ? AND user_id = ? AND completed = 1 ${dateQuery}`,
                ...habitParams
            );

            // Calculate denominator (days in range)
            let daysInRange = 30; // default
            if (range === 'week') daysInRange = 7;
            else if (range === 'month') daysInRange = 30;
            else if (range === 'year') daysInRange = 365;
            else if (range === 'all') {
                // For all time, we might need a better metric, but let's estimate or just show raw count.
                // Or measure from habit creation date? Let's use 30 as placeholder or just show raw count.
                // Actually, for "all time", a percentage is hard without creation date relative usage.
                daysInRange = 30; // Fallback to avoid division by zero errors if logic is complex
            } else if (range === 'today') {
                daysInRange = 1;
            }

            habitStats.push({
                ...habit,
                completionCount: logCount?.count || 0,
                // If range is 'all', maybe just show count? For consistency let's try a rate if useful, else just count.
                // Let's stick to the current logic but adapted.
                rate: range === 'all' ? 0 : Math.round(((logCount?.count || 0) / daysInRange) * 100)
            });
        }

        // 3. Best Day of Week (Filtered by range)
        const dayOfWeekStats = await this.db.all<{ day: string, count: number }[]>(
            `SELECT strftime('%w', log_date) as day, COUNT(*) as count 
            FROM habit_logs 
            WHERE user_id = ? AND completed = 1 ${dateQuery}
            GROUP BY day 
            ORDER BY count DESC`,
            ...params
        );

        const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const bestDay = dayOfWeekStats.length > 0 ? daysMap[parseInt(dayOfWeekStats[0].day)] : 'N/A';

        return {
            totalCompletions,
            habitStats: habitStats.sort((a, b) => b.rate - a.rate),
            bestDay
        };
    }
}

export const habitModel = new HabitModel();
