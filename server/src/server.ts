import 'dotenv/config';
import app from './app';
import { initializeDatabase } from './config/db';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

async function startServer() {
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
