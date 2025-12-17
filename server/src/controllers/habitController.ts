import { Request, Response } from 'express';
import { habitModel } from '../models/habitModel';

export async function getAllHabits(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const habits = await habitModel.getAllHabits(userId);
        res.json(habits);
    } catch (error) {
        console.error('Get habits error:', error);
        res.status(500).json({ message: 'Server error fetching habits' });
    }
}

export async function createHabit(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { name, icon, color, category, frequency_days, target_count } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Habit name is required' });
    }

    try {
        const habitId = await habitModel.createHabit(
            userId,
            name,
            icon,
            color,
            category,
            frequency_days ? JSON.stringify(frequency_days) : undefined,
            target_count
        );
        res.status(201).json({ message: 'Habit created', habitId });
    } catch (error) {
        console.error('Create habit error:', error);
        res.status(500).json({ message: 'Server error creating habit' });
    }
}

export async function deleteHabit(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const habitId = parseInt(req.params.id);

    try {
        await habitModel.deleteHabit(userId, habitId);
        res.json({ message: 'Habit deleted' });
    } catch (error) {
        console.error('Delete habit error:', error);
        res.status(500).json({ message: 'Server error deleting habit' });
    }
}

export async function toggleHabit(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const habitId = parseInt(req.params.id);
    const date = req.body.date || new Date().toISOString().split('T')[0];

    try {
        const completed = await habitModel.toggleHabit(userId, habitId, date);
        res.json({ completed });
    } catch (error) {
        console.error('Toggle habit error:', error);
        res.status(500).json({ message: 'Server error toggling habit' });
    }
}

export async function getHabitHistory(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const habitId = parseInt(req.params.id);
    const days = parseInt(req.query.days as string) || 30;

    try {
        const history = await habitModel.getHabitHistory(userId, habitId, days);
        res.json(history);
    } catch (error) {
        console.error('Get habit history error:', error);
        res.status(500).json({ message: 'Server error fetching habit history' });
    }
}

export async function getHabitInsights(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const range = (req.query.range as string) || 'month';
        const insights = await habitModel.getHabitInsights(userId, range);
        res.json(insights);
    } catch (error) {
        console.error('Get habit insights error:', error);
        res.status(500).json({ message: 'Server error fetching habit insights' });
    }
}
