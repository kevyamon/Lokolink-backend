// routes/sessionRoutes.js

const express = require('express');
const router = express.Router();
const {
  createSession,
  deleteSession,
  getActiveSessions,
  getSessionDetails,
} = require('../controllers/sessionController');

// Importer notre "garde" JWT
const { protect } = require('../middleware/authMiddleware');

// --- Routes Protégées (Délégué/Admin) ---

// POST /api/sessions/create
// 'protect' s'exécute en premier. S'il passe, il appelle 'createSession'.
router.post('/create', protect, createSession);

// DELETE /api/sessions/:id
router.delete('/:id', protect, deleteSession);


// --- Routes Publiques (Filleul) ---

// GET /api/sessions/active
router.get('/active', getActiveSessions);

// GET /api/sessions/:id
router.get('/:id', getSessionDetails);


module.exports = router;