 // routes/contactRoutes.js

const express = require('express');
const router = express.Router();
const { getContactLinks } = require('../controllers/contactController');

// GET /api/contact
router.get('/', getContactLinks);

module.exports = router;
