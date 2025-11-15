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

// Charger les variables d'environnement
dotenv.config();

// Connexion à MongoDB
connectDB();

const app = express();

// Création du serveur HTTP (nécessaire pour combiner Express et Socket.io)
const server = http.createServer(app);

// Configuration des origines autorisées
const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173'];

// Configuration Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
});

// Configuration CORS Express
const corsOptions = {
  origin: allowedOrigins,
  optionsSuccessStatus: 200,
  credentials: true,
};
app.use(cors(corsOptions));

// Middlewares Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- MIDDLEWARE SOCKET.IO ---
// Rend l'objet 'io' accessible dans toutes les routes via 'req.io'
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Événement de connexion Socket.io (pour le debug)
io.on('connection', (socket) => {
  console.log('Un client est connecté via Socket.io:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client déconnecté:', socket.id);
  });
});

// Route de test
app.get('/', (req, res) => {
  res.send('API LOKOlink en marche (avec WebSockets)...');
});

// Utiliser les routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/pairings', pairingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);

const PORT = process.env.PORT || 5000;

// IMPORTANT: On utilise server.listen et non app.listen
server.listen(PORT, () =>
  console.log(`Serveur démarré sur le port ${PORT} avec Socket.io`)
);