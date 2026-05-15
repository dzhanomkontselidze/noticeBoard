import db from '../db/connector.js';

// ─── Notice Model ─────────────────────────────────────────────────────────────

class Notice {
    id;
    title;
    author_id; // Змінено з author на author_id
    content;
    importance;
    start_date;
    end_date;
    status;

    constructor({ id, title, author_id, content, importance, start_date, end_date, status }) {
        this.id = id;
        this.title = title;
        this.author_id = author_id; // Тепер це ID профілю
        this.content = content;
        this.importance = importance;
        this.start_date = start_date;
        this.end_date = end_date;
        this.status = status || 'active';
    }

    toJSON() {
        return {
            title: this.title,
            author_id: this.author_id, // Оновлено назву ключа
            content: this.content,
            importance: this.importance,
            start_date: this.start_date,
            end_date: this.end_date,
            status: this.status,
        };
    }
}

// ─── Validator ────────────────────────────────────────────────────────────────

export class NoticeValidator {
    notice;

    constructor(noticeData) {
        this.notice = noticeData;
    }

    // Цей метод МАЄ бути тут, щоб validate() міг його викликати
    checkStringField(value, fieldName) {
        if (!value || typeof value !== 'string' || value.trim().length < 2) {
            throw new Error(`Поле '${fieldName}' є обов'язковим і має містити принаймні 2 символи.`);
        }
    }

    checkImportance(value) {
        const num = Number(value);
        if (isNaN(num) || num < 0 || num > 10) {
            throw new Error("Важливість має бути числом від 0 до 10.");
        }
    }

    checkDates(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error("Дати мають бути коректними.");
        }
        if (endDate <= startDate) {
            throw new Error("Дата завершення має бути пізніше за дату початку.");
        }
    }

    validate() {
        const { title, importance, start_date, end_date } = this.notice;
        
        // Тепер 'this' точно знайде метод вище
        this.checkStringField(title, 'Заголовок');
        this.checkImportance(importance);
        this.checkDates(start_date, end_date);
    }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class NoticeService {
    notice;

    constructor(noticeData) {
        this.notice = new Notice(noticeData);
    }

    async create() {
        // Використовуємо таблицю user_notices та поле author_id
        const { title, author_id, content, importance, start_date, end_date, status } = this.notice;
        try {
            const res = await db.query(`
                INSERT INTO user_notices (title, author_id, content, importance, start_date, end_date, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *`,
                [title, author_id, content, importance, start_date, end_date, status]
            );
            console.log(`✓ Оголошення створено в новій таблиці: ${res.rows[0].title}`);
            return res.rows[0];
        } catch (err) {
            console.error('Помилка створення оголошення:', err);
            throw err;
        }
    }

    async update(id) {
        const fields = [];
        const values = [];
        let index = 1;

        for (const [key, value] of Object.entries(this.notice.toJSON())) {
            if (value !== undefined && value !== '') {
                fields.push(`${key} = $${index}`);
                values.push(value);
                index++;
            }
        }

        if (fields.length === 0) throw new Error('Немає даних для оновлення');

        values.push(id);
        // Змінено назву таблиці на user_notices
        const query = `UPDATE user_notices SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`;

        try {
            const res = await db.query(query, values);
            if (res.rows.length === 0) throw new Error('Оголошення не знайдено');
            return res.rows[0];
        } catch (err) {
            console.error('Помилка оновлення:', err);
            throw err;
        }
    }

    static async delete(id) {
        try {
            // Змінено назву таблиці на user_notices
            const res = await db.query('DELETE FROM user_notices WHERE id = $1 RETURNING *', [id]);
            if (res.rows.length === 0) throw new Error('Оголошення не знайдено');
            return true;
        } catch (err) {
            console.error('Помилка видалення:', err);
            throw err;
        }
    }

    static async archiveExpired() {
        try {
            // Змінено назву таблиці на user_notices
            const res = await db.query(`
                UPDATE user_notices SET status = 'archived'
                WHERE end_date < NOW() AND status = 'active'
                RETURNING *`
            );
            if (res.rows.length > 0) {
                console.log(`✓ Заархівовано ${res.rows.length} оголошень у user_notices.`);
            }
        } catch (err) {
            console.error('Помилка архівації:', err);
        }
    }
}
