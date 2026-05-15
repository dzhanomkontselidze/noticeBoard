import dotenv from 'dotenv'
dotenv.config()
import 'express-async-errors';
import createError from 'http-errors'
import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import session from 'express-session'; 

import noticeRouter from './routes/notices.js'
import profileRouter from './routes/profile.js'; 
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

import hbs from 'hbs';

hbs.registerHelper('eq', function (a, b) {
  return a === b;
});
hbs.registerHelper('gte', function (a, b) {
  return a >= b;
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'board-secret-key', 
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } 
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null; 
  next();
});

app.use('/notices', noticeRouter);
app.use('/profile', profileRouter);

app.use((err, req, res, next) => {
  if (err.status === 404) return next(err);
  console.error('Global error caught:', err.message || err);
  res.status(500).render('error', { 
    message: err.message || 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err : {} 
  });
});

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

export default app;
