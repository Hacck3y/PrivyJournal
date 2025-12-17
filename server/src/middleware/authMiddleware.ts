import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/auth';

interface JwtPayload {
    id: number;
    username: string;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication token required' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user as JwtPayload;
        next();
    });
};

// Admin-only middleware - restricts access to specific username
const ADMIN_USERNAME = 'admin';

export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.username !== ADMIN_USERNAME) {
        return res.status(403).json({ message: 'You are not an admin' });
    }
    next();
};
