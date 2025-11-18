// kevyamon/lokolink-backend/server.js

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Importation des routes
const authRoutes = require('./routes/authRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const pairingRoutes = require('./routes/pairingRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes'); // Assure-toi que cette route existe

dotenv.config();

// Connexion à la base de données
connectDB();

const app = express();
const server = http.createServer(app);

// MIDDLEWARES D'EXPRESS
app.use(express.json()); // Permet d'accepter les données JSON dans le corps des requêtes

// --- DÉBUT DE LA LOGIQUE CORS MULTI-DOMAINES ---

// 1. On parse la variable d'environnement FRONTEND_URL.
// Elle est censée être sous la forme "url1, url2, url3"
const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:5173', 'http://localhost:3000']; // URL de fallback en dev

// 2. Configuration CORS pour Express
const corsOptions = {
    origin: function (origin, callback) {
        // Permettre les requêtes sans 'origin' (ex: Postman, curl, ou applications mobiles)
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
    optionsSuccessStatus: 204 // Pour gérer les requêtes OPTIONS
};

app.use(cors(corsOptions));

// --- FIN DE LA LOGIQUE CORS MULTI-DOMAINES ---


// CONFIGURATION SOCKET.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins, // Socket.io accepte un tableau ici
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
  allowEIO3: true // Pour compatibilité si besoin
});

// LOGIQUE SOCKET.IO (simple exemple)
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Exemple: joindre une session spécifique
  socket.on('joinSession', (sessionId) => {
    socket.join(sessionId);
    console.log(`User ${socket.id} joined session ${sessionId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// PASSAGE DE L'INSTANCE IO AUX REQUÊTES
app.use((req, res, next) => {
    req.io = io; // On attache l'instance de Socket.io à la requête
    next();
});

// ROUTES
app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/pairing', pairingRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// GESTION DES ERREURS (Doivent être après les routes)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));

// On gère les promesses non traitées (unhandled rejections)
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Ferme le serveur et quitte le processus
    server.close(() => process.exit(1));
});