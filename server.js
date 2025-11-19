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
// RETRAIT DE XSS-CLEAN (Cause probable du crash 500)
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

// =================================================================
// 1. CONFIGURATION CORS
// =================================================================

const normalizeUrl = (url) => url ? url.trim().replace(/\/$/, '') : '';

const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:3000',
  'https://lokolink.onrender.com', 
].map(normalizeUrl);

if (process.env.FRONTEND_URL) {
  const envOrigins = process.env.FRONTEND_URL.split(',').map(normalizeUrl);
  allowedOrigins.push(...envOrigins);
}

console.log('CORS Allowed Origins:', allowedOrigins);

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const normalizedOrigin = normalizeUrl(origin);
        if (allowedOrigins.includes(normalizedOrigin)) {
            callback(null, true);
        } else {
            console.error(`BLOCKED BY CORS: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// =================================================================
// 2. SÉCURITÉ & MIDDLEWARES
// =================================================================

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Trop de requêtes.'
});
app.use(limiter);

app.use(express.json({ limit: '10kb' })); 
app.use(mongoSanitize()); // Protection NoSQL
// app.use(xss()); <--- SUPPRIMÉ
app.use(hpp()); // Protection pollution paramètres

// =================================================================
// 3. SOCKET.IO
// =================================================================

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
});

app.use((req, res, next) => {
    req.io = io; 
    next();
});

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// =================================================================
// 4. ROUTES
// =================================================================

app.get('/', (req, res) => {
    res.status(200).send('API LokoLink is running & secured.');
});

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/pairings', pairingRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// =================================================================
// 5. GESTIONNAIRE D'ERREURS GLOBAL (LE MOUCHARD)
// =================================================================
// Si une erreur survient n'importe où, elle tombe ici et est logguée
app.use((err, req, res, next) => {
  console.error("🔥 ERREUR SERVEUR DETECTÉE :", err.stack);
  res.status(500).json({ 
    message: 'Erreur interne du serveur', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));

process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
});