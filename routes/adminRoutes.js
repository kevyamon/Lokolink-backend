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
  toggleSessionStatus, // Import
} = require('../controllers/adminController');

// Importer nos "gardes"
const { protect, admin } = require('../middleware/authMiddleware');

// --- Codes & Utilisateurs ---
router.post('/generate-code', protect, admin, generateRegistrationCode);
router.get('/codes', protect, admin, getAllCodes);
router.delete('/codes/:id', protect, admin, deleteCode);
router.get('/users', protect, admin, getAllUsers);

// --- Sessions ---
router.get('/sessions', protect, admin, getAllSessionsAdmin);
router.delete('/sessions/:id', protect, admin, deleteSessionAdmin);

// Mettre à jour un parrain
router.put(
  '/sessions/:sessionId/sponsors/:sponsorId',
  protect,
  admin,
  updateSponsorInfo
);

// NOUVEAU : Changer le statut (Actif/Inactif)
router.patch('/sessions/:id/toggle-status', protect, admin, toggleSessionStatus);

module.exports = router;