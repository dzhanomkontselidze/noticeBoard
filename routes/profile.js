import express from 'express';
import db from '../db/connector.js';
import { ProfileValidator, ProfileService } from '../controllers/profileController.js';

const router = express.Router();

// ─── REGISTER ───────────────────────────────────────────────────
router.get('/register', (req, res) => {
    res.render('register', { formData: {}, errors: {} });
});

router.post('/register', async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;
        if (password !== confirmPassword) {
            return res.status(400).render('register', {
                errors: { confirmPassword: "Паролі не збігаються!" },
                formData: req.body
            });
        }
        new ProfileValidator(req.body).validateRegistration();
        const user = await ProfileService.registerProfile(username, email, password);

        // Записуємо в сесію так само, як при логіні
        req.session.user = { id: user.id, username: user.username };
        req.session.save(() => res.redirect('/notices'));
    } catch (err) {
        res.status(400).render('register', {
            errors: { general: err.message },
            formData: req.body
        });
    }
});

// ─── LOGIN ────────────────────────────────────────────────
router.get('/login', (req, res) => {
    res.render('login', { formData: {}, errors: {} }); 
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await ProfileService.login(username, password);

        req.session.user = {
            id: user.id,
            username: user.username
        };

        req.session.save(() => res.redirect('/notices'));
    } catch (err) {
        res.render('login', { 
            errors: { password: "Невірний логін або пароль" }, 
            formData: req.body 
        });
    }
});

// ─── LOGOUT (Додала, щоб працювала кнопка Exit) ──────────────
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/notices');
    });
});

// ─── PROFILE ───────────────────────────────────────
router.get('/my-profile', async (req, res) => {
    // ВИПРАВЛЕНО: беремо id з req.session.user
    if (!req.session.user) return res.redirect('/profile/login');
    
    const userId = req.session.user.id; 
    const result = await db.query('SELECT id, username, email FROM profiles WHERE id = $1', [userId]);
    
    res.render('profile', { user: result.rows[0] });
});

// ─── UPDATE ─────────────────────────────────────────────────────
router.post('/update', async (req, res) => {
    try {
        const userId = req.body.id; 
        const updateData = {
            username: req.body.username,
            email: req.body.email,
            password: req.body.password 
        };

        await ProfileService.updateProfile(userId, updateData);
        
        // Оновлюємо ім'я в сесії, якщо воно змінилося
        req.session.user.username = updateData.username;
        
        req.session.save(() => res.redirect('/notices'));
    } catch (err) {
        res.status(400).send(`Помилка оновлення: ${err.message}`);
    }
});

// ─── DELETE ──────────────────────────────────────────────────────
router.post('/delete', async (req, res) => {
    try {
        const userId = req.body.id; 
        await ProfileService.deleteProfile(userId);
        
        // ВИПРАВЛЕНО: req замість eq
        req.session.destroy(() => {
            res.redirect('/profile/register');
        });
    } catch (err) {
        res.status(500).send(`Помилка видалення: ${err.message}`);
    }
});

export default router;