import db from '../db/connector.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// ─── Profile Model ─────────────────────────────────────────────────────────────
class Profile {
    id;
    username;
    email;
    password_hash;

    constructor({ id, username, email, password_hash }) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.password_hash = password_hash;
    }

    toJSON() {
        return {
            username: this.username,
            email: this.email,
            password_hash: this.password_hash 
        };
    }
}

// ─── Profile Validator ──────────────────────────────────────────────────────────
export class ProfileValidator {
    data;

    constructor(data) {
        this.data = data;
    }

    validateRegistration() {
        const { username, email, password } = this.data;
        if (!username || username.length < 3) throw new Error("Логін занадто короткий");
        if (!email || !email.includes('@')) throw new Error("Некоректний email");
        if (!password || password.length < 6) throw new Error("Пароль має бути мін. 6 символів");
    }
}

// ─── Profile Service ───────────────────────────────────────────────────────────
export class ProfileService {
    
    static async registerProfile(username, email, password) {
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        try {
            const res = await db.query(`
                INSERT INTO profiles (username, email, password_hash)
                VALUES ($1, $2, $3)
                RETURNING id, username, email`,
                [username, email, hash]
            );
            return res.rows[0];
        } catch (err) {
            if (err.code === '23505') throw new Error('Користувач вже існує');
            throw err;
        }
    }

    static async login(username, password) {
        const res = await db.query('SELECT * FROM profiles WHERE username = $1', [username]);
        if (res.rows.length === 0) throw new Error('Користувача не знайдено');

        const user = res.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) throw new Error('Неправильний пароль');

        return user;
    }

    static async updateProfile(id, updateData) {
        const fields = [];
        const values = [];
        let index = 1;

        if (updateData.password) {
            updateData.password_hash = await bcrypt.hash(updateData.password, SALT_ROUNDS);
            delete updateData.password;
        }

        for (const [key, value] of Object.entries(updateData)) {
            if (value !== undefined && value !== '') {
                fields.push(`${key} = $${index}`);
                values.push(value);
                index++;
            }
        }

        values.push(id);
        const query = `UPDATE profiles SET ${fields.join(', ')} WHERE id = $${index} RETURNING id, username, email`;
        const res = await db.query(query, values);
        return res.rows[0];
    }

    static async deleteProfile(id) {
        try {
            const res = await db.query(
                'DELETE FROM profiles WHERE id = $1 RETURNING username', 
                [id]
            );

            if (res.rows.length === 0) {
                throw new Error('Профіль не знайдено');
            }

            console.log(`✓ Профіль @${res.rows[0].username} та всі його оголошення видалені.`);
            return true;
        } catch (err) {
            console.error('Помилка видалення профілю:', err.message);
            throw err;
        }
    }
}

