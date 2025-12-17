import { getDb } from '../config/db';

export interface User {
    id: number;
    username: string;
    password_hash?: string;
}

class UserModel {
    private get db() {
        return getDb();
    }

    async create(username: string, passwordHash: string): Promise<number> {
        const result = await this.db.run(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
            username,
            passwordHash
        );
        return result.lastID!;
    }

    async findByUsername(username: string): Promise<User | undefined> {
        return this.db.get<User>('SELECT * FROM users WHERE username = ?', username);
    }

    async findById(id: number): Promise<Pick<User, 'id' | 'username'> | undefined> {
        return this.db.get<Pick<User, 'id' | 'username'>>(
            'SELECT id, username FROM users WHERE id = ?',
            id
        );
    }
}

export default new UserModel();
