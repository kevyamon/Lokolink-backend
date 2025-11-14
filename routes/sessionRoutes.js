// routes/sessionRoutes.js

const express = require('express');
const router = express.Router();
const {
  createSession,
  getActiveSessions,
  getSessionDetails,
  deleteSession, // AJOUT
} = require('../controllers/sessionController');

// Route pour créer une session
// POST /api/sessions/create
router.post('/create', createSession);

// Route pour lister les sessions actives pour les filleuls
// GET /api/sessions/active
router.get('/active', getActiveSessions);

// Route pour les détails d'une session
// GET /api/sessions/:id
router.get('/:id', getSessionDetails);

// Route pour supprimer (désactiver) une session
// DELETE /api/sessions/:id
router.delete('/:id', deleteSession); // AJOUT

module.exports = router;