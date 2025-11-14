  // routes/authRoutes.js

const express = require('express');
const router = express.Router();
const {
  loginDelegue,
  loginSuperAdmin,
} = require('../controllers/authController');

// Route pour l'authentification du Délégué
// POST /api/auth/delegue/login
router.post('/delegue/login', loginDelegue);

// Route pour l'authentification du Super-Admin
// POST /api/auth/superadmin/login
router.post('/superadmin/login', loginSuperAdmin);

module.exports = router;
