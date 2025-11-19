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

// =================================================================
// 1. CONFIGURATION CORS (EN PREMIER !!!)
// =================================================================

// Normalisation : on enlève les slashs de fin potentiels pour la comparaison
const normalizeUrl = (url) => url ? url.trim().replace(/\/$/, '') : '';

const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:3000',
  'https://lokolink.onrender.com', // Ton Frontend
].map(normalizeUrl);

// Ajout des URLs depuis l'environnement
if (process.env.FRONTEND_URL) {
  const envOrigins = process.env.FRONTEND_URL.split(',').map(normalizeUrl);
  allowedOrigins.push(...envOrigins);
}

console.log('CORS Allowed Origins:', allowedOrigins); // Log pour débugger sur Render si besoin

const corsOptions = {
    origin: function (origin, callback) {
        // Autoriser les requêtes sans 'origin' (ex: Postman, App mobile, server-to-server)
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

// Appliquer CORS immédiatement
app.use(cors(corsOptions));
// Gérer explicitement les requêtes OPTIONS (Preflight) pour toutes les routes
app.options('*', cors(corsOptions));

// =================================================================
// 2. AUTRES MESURES DE SÉCURITÉ (APRÈS CORS)
// =================================================================

// Helmet : Sécurise les en-têtes HTTP
// On doit autoriser le chargement de ressources externes (images, scripts)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // Si besoin de désactiver temporairement CSP pour tester :
  // contentSecurityPolicy: false, 
}));

// Rate Limiting : Anti-Brute Force
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Trop de requêtes, veuillez patienter.'
});
app.use(limiter);

// Assainissement des données (Anti-Injection)
app.use(express.json({ limit: '10kb' })); 
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// =================================================================
// 3. SOCKET.IO & ROUTES
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

// Routes API
app.get('/', (req, res) => {
    res.send('API LokoLink is running & secured.');
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