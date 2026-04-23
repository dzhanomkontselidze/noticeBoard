import express from 'express';
import db from '../db/connector.js';
import { NoticeService, NoticeValidator } from '../controllers/noticeController.js';

const router = express.Router();

// ─── Auto-archive expired notices on every request ────────────────────────────
router.use(async (req, res, next) => {
    await NoticeService.archiveExpired();
    next();
});

// ─── List all notices ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    const { status = 'active', sort = 'importance' } = req.query;

    const validSorts = {
        importance: 'importance DESC',
        date: 'start_date ASC',
        author: 'author ASC'
    };
    const orderBy = validSorts[sort] || 'importance DESC';

    try {
        const result = await db.query(
            `SELECT * FROM notices WHERE status = $1 ORDER BY ${orderBy}`,
            [status]
        );
        res.render('notices', {
            notices: result.rows,
            showList: true,
            showForm: false,
            currentStatus: status,
            currentSort: sort
        });
    } catch (err) {
        console.error('Помилка завантаження оголошень:', err);
        res.status(500).send('Помилка сервера');
    }
});

// ─── New notice form ──────────────────────────────────────────────────────────
router.get('/new', (req, res) => {
    res.render('notices', {
        showList: false,
        showForm: true,
        editingNotice: null
    });
});

// ─── Create notice ────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    try {
        new NoticeValidator(req.body).validate();
        await new NoticeService(req.body).create();
        res.redirect('/notices');
    } catch (err) {
        console.error('Помилка створення:', err.message);
        res.status(400).send(`Помилка: ${err.message} <br><br><a href="/notices/new">Повернутися назад</a>`);
    }
});

// ─── Edit notice form ─────────────────────────────────────────────────────────
router.get('/edit/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM notices WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).send('Оголошення не знайдено');

        res.render('notices', {
            showList: false,
            showForm: true,
            editingNotice: result.rows[0]
        });
    } catch (err) {
        console.error('Помилка завантаження для редагування:', err);
        res.status(500).send('Помилка сервера');
    }
});

// ─── Update notice ────────────────────────────────────────────────────────────
router.post('/edit/:id', async (req, res) => {
    const { id } = req.params;
    try {
        new NoticeValidator(req.body).validate();
        await new NoticeService(req.body).update(id);
        res.redirect('/notices');
    } catch (err) {
        console.error('Помилка оновлення:', err.message);
        res.status(400).send(`Помилка: ${err.message} <br><br><a href="/notices/edit/${id}">Повернутися назад</a>`);
    }
});

// ─── Delete notice ────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        await NoticeService.delete(req.params.id);
        res.status(200).json({ message: 'Оголошення видалено!' });
    } catch (err) {
        console.error('Помилка видалення:', err.message);
        res.status(500).json({ error: err.message });
    }
});

export default router;