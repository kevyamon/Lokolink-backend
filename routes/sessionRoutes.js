// routes/sessionRoutes.js

const express = require('express');
const router = express.Router();
const {
  createSession,
  getMySessions, // <--- AJOUTÉ
  getMySession,
  deleteSession,
  getActiveSessions,
  getSessionDetails,
  joinSession,
  verifySessionPassword,
} = require('../controllers/sessionController');

const { protect } = require('../middleware/authMiddleware');

// --- Routes Protégées (Délégué/Admin) ---
router.post('/create', protect, createSession);
router.get('/my-sessions', protect, getMySessions); // <--- NOUVELLE ROUTE
router.get('/my-session/:id', protect, getMySession);
router.delete('/:id', protect, deleteSession);
router.post('/verify-password', protect, verifySessionPassword);

// --- Routes Publiques ---
router.get('/active', getActiveSessions);
router.get('/:id', getSessionDetails);
router.post('/join', joinSession);

module.exports = router;