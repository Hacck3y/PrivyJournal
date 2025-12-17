import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import entryRoutes from './routes/entryRoutes';
import habitRoutes from './routes/habitRoutes';
import quickNoteRoutes from './routes/quickNoteRoutes';
import dataRoutes from './routes/dataRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', entryRoutes);
app.use('/api', habitRoutes);
app.use('/api', quickNoteRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/admin', adminRoutes);

// Root route
app.get('/', (req, res) => {
    res.send('Journal App Backend is Running!');
});

export default app;
