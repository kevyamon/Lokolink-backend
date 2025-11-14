// routes/pairingRoutes.js

const express = require('express');
const router = express.Router();
const { findSponsor } = require('../controllers/pairingController');

// Route pour trouver un parrain
// POST /api/pairings/find
router.post('/find', findSponsor); // Inchangé

module.exports = router;