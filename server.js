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
// On configure Helmet pour autoriser les ressources cross-origin (nécessaire pour le chargement d'images ou API externes)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// --- 2. SÉCURITÉ : RATE LIMITING ---
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
});
app.use(limiter);

// MIDDLEWARES D'EXPRESS
app.use(express.json({ limit: '10kb' })); 

// --- 3. SÉCURITÉ : ASSAINISSEMENT ---
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// --- 4. CONFIGURATION CORS (LA CORRECTION EST ICI) ---

// On définit la liste blanche.
// IMPORTANT : Assure-toi que 'https://lokolink.onrender.com' est bien dans tes variables d'environnement FRONTEND_URL sur Render,
// OU ajoute-le en dur ici pour être sûr à 100% pendant le debug.
const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:3000',
  'https://lokolink.onrender.com', // Ton Frontend
  // Ajoute ici d'autres domaines si nécessaire
];

// Si une variable d'env existe, on l'ajoute à la liste
if (process.env.FRONTEND_URL) {
  const envOrigins = process.env.FRONTEND_URL.split(',').map(url => url.trim());
  allowedOrigins.push(...envOrigins);
}

const corsOptions = {
    origin: function (origin, callback) {
        // Autoriser les requêtes sans 'origin' (ex: Postman, App mobile, server-to-server)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.error(`CORS BLOCKED: Origin ${origin} is not in allowed list.`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Options ajouté pour le preflight
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'], // Explicitement autorisé
    optionsSuccessStatus: 200 // Pour supporter les vieux navigateurs/proxies
};

app.use(cors(corsOptions));

// CONFIGURATION SOCKET.IO (Doit aussi accepter le CORS)
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