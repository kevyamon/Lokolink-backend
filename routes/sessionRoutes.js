// routes/sessionRoutes.js

const express = require('express');
const router = express.Router();
const {
  createSession,
  getMySession, // Import nouveau
  deleteSession,
  getActiveSessions,
  getSessionDetails,
  joinSession, // Import nouveau
} = require('../controllers/sessionController');

const { protect } = require('../middleware/authMiddleware');

// --- Routes Protégées (Délégué/Admin) ---

// POST /api/sessions/create
router.post('/create', protect, createSession);

// GET /api/sessions/my-session/:id (POUR LE DASHBOARD DÉLÉGUÉ)
router.get('/my-session/:id', protect, getMySession);

// DELETE /api/sessions/:id
router.delete('/:id', protect, deleteSession);


// --- Routes Publiques (Filleul & Parrains) ---

// GET /api/sessions/active
router.get('/active', getActiveSessions);

// GET /api/sessions/:id
router.get('/:id', getSessionDetails);

// POST /api/sessions/join (Inscription Parrain via Lien)
router.post('/join', joinSession);

module.exports = router;