// server.js

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http'); 
const { Server } = require('socket.io'); 
const connectDB = require('./config/db');

// --- MODULES DE SÉCURITÉ ---
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');

// Importer les routes
const authRoutes = require('./routes/authRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const pairingRoutes = require('./routes/pairingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const contactRoutes = require('./routes/contactRoutes');

// Charger les variables d'environnement
dotenv.config();

// Connexion à MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// --- 1. SÉCURITÉ : EN-TÊTES HTTP (HELMET) ---
// Place des en-têtes sécurisés pour prévenir diverses attaques (XSS, Clickjacking, etc.)
app.use(helmet());

// --- 2. SÉCURITÉ : RATE LIMITING (ANTI-BRUTE FORCE) ---
// Limite chaque IP à 150 requêtes par fenêtre de 10 minutes
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
});
app.use(limiter);

// MIDDLEWARES D'EXPRESS
app.use(express.json({ limit: '10kb' })); // Limite la taille du body pour éviter les attaques DoS

// --- 3. SÉCURITÉ : ASSAINISSEMENT DES DONNÉES ---
// Empêche l'injection NoSQL (ex: email: {"$gt": ""})
app.use(mongoSanitize());

// Empêche les attaques XSS (Cross-Site Scripting) dans les inputs
app.use(xss());

// Empêche la pollution des paramètres HTTP
app.use(hpp());

// --- CONFIGURATION CORS (STRICTE) ---
const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error(`CORS BLOCKED: Origin ${origin} is not in allowed list.`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// CONFIGURATION SOCKET.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
});

// PASSAGE DE L'INSTANCE IO AUX REQUÊTES
app.use((req, res, next) => {
    req.io = io; 
    next();
});

// Événement de connexion Socket.io
io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ROUTES
app.get('/', (req, res) => {
    res.send('API is running secured...');
});

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/pairings', pairingRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));

process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
});