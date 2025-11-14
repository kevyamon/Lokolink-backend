// routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const {
  generateRegistrationCode,
  getAllCodes,
  deleteCode,
  getAllUsers,
  getAllSessionsAdmin,
  deleteSessionAdmin,
  updateSponsorInfo,
} = require('../controllers/adminController');

// Importer nos "gardes"
const { protect, admin } = require('../middleware/authMiddleware');

// --- Routes de Gestion des Utilisateurs et Codes (PLAN P5) ---
// Toutes ces routes nécessitent d'être 'admin' (superadmin ou eternal)

// POST /api/admin/generate-code
router.post('/generate-code', protect, admin, generateRegistrationCode);

// GET /api/admin/codes
router.get('/codes', protect, admin, getAllCodes);

// DELETE /api/admin/codes/:id
router.delete('/codes/:id', protect, admin, deleteCode);

// GET /api/admin/users
router.get('/users', protect, admin, getAllUsers);


// --- Routes de Gestion des Sessions (ANCIENNES) ---
// On les protège aussi avec 'protect' et 'admin'

// GET /api/admin/sessions
router.get('/sessions', protect, admin, getAllSessionsAdmin);

// DELETE /api/admin/sessions/:id
router.delete('/sessions/:id', protect, admin, deleteSessionAdmin);

// PUT /api/admin/sessions/:sessionId/sponsors/:sponsorId
router.put(
  '/sessions/:sessionId/sponsors/:sponsorId',
  protect,
  admin,
  updateSponsorInfo
);
// GET /api/admin/sessions/:id (Manquant dans le controller, mais on peut l'ajouter si besoin)
// Pour l'instant, le frontend n'en a pas besoin.

module.exports = router;
