// routes/sessionRoutes.js

const express = require('express');
const router = express.Router();
const {
  createSession,
  getMySession,
  deleteSession,
  getActiveSessions,
  getSessionDetails,
  joinSession,
  verifySessionPassword, // <--- Import
} = require('../controllers/sessionController');

const { protect } = require('../middleware/authMiddleware');

// --- Routes Protégées (Délégué/Admin) ---
router.post('/create', protect, createSession);
router.get('/my-session/:id', protect, getMySession);
router.delete('/:id', protect, deleteSession);

// NOUVEAU : Vérification mot de passe pour accès dashboard
router.post('/verify-password', protect, verifySessionPassword);


// --- Routes Publiques ---
router.get('/active', getActiveSessions);
router.get('/:id', getSessionDetails);
router.post('/join', joinSession);

module.exports = router;