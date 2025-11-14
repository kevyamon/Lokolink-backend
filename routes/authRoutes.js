// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const {
  registerUser,
  registerEternalAdmin,
  loginUser,
} = require('../controllers/authController');

// 1. Remplacer les anciennes routes de login
// POST /api/auth/login
router.post('/login', loginUser);

// 2. Ajouter les nouvelles routes d'inscription
// POST /api/auth/register
router.post('/register', registerUser);

// POST /api/auth/register-eternal
router.post('/register-eternal', registerEternalAdmin);

module.exports = router;