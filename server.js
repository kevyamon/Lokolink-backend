// server.js

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http'); // Module natif Node.js requis pour Socket.io
const { Server } = require('socket.io'); // Import Socket.io
const connectDB = require('./config/db');

// Importer les routes
const authRoutes = require('./routes/authRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const pairingRoutes = require('./routes/pairingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const contactRoutes = require('./routes/contactRoutes');

// --- RETIRÉ : const { notFound, errorHandler } = require('./middleware/errorMiddleware'); ---

// Charger les variables d'environnement
dotenv.config();

// Connexion à MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// MIDDLEWARES D'EXPRESS
app.use(express.json()); // Permet d'accepter les données JSON dans le corps des requêtes

// --- DÉBUT DE LA LOGIQUE CORS MULTI-DOMAINES (Le but de la manip) ---

// 1. On parse la variable d'environnement FRONTEND_URL.
const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

// 2. Configuration CORS pour Express
const corsOptions = {
    origin: function (origin, callback) {
        // Permettre les requêtes sans 'origin' (ex: Postman, curl, applications mobiles)
        if (!origin) return callback(null, true);

        // Vérifie si l'origine fait partie de la liste autorisée
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

// 3. CONFIGURATION SOCKET.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
});

// PASSAGE DE L'INSTANCE IO AUX REQUÊTES
app.use((req, res, next) => {
    req.io = io; // On attache l'instance de Socket.io à la requête
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
    res.send('API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/pairings', pairingRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// --- RETIRÉ : app.use(notFound); ---
// --- RETIRÉ : app.use(errorHandler); ---


const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));

// Gère les promesses non traitées
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
});