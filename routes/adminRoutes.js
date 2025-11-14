 // routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const {
  getAllSessionsAdmin,
  getSessionDetailsAdmin,
  updateSponsorInfo,
  deleteSessionAdmin,
} = require('../controllers/adminController');

// NOTE: Ces routes devraient être protégées par un middleware
// qui vérifie un token JWT Super-Admin, mais pour l'instant
// on se fie à la protection du frontend (comme demandé).

// GET /api/admin/sessions -> Lister toutes les sessions
router.get('/sessions', getAllSessionsAdmin);

// GET /api/admin/sessions/:id -> Détails d'une session pour édition
router.get('/sessions/:id', getSessionDetailsAdmin);

// PUT /api/admin/sessions/:sessionId/sponsors/:sponsorId -> Mettre à jour 1 parrain
router.put('/sessions/:sessionId/sponsors/:sponsorId', updateSponsorInfo);

// DELETE /api/admin/sessions/:id -> Suppression définitive
router.delete('/sessions/:id', deleteSessionAdmin);

module.exports = router;
