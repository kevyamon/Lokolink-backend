// controllers/adminController.js

const Session = require('../models/sessionModel');
const Pairing = require('../models/pairingModel');
const User = require('../models/userModel');
const RegistrationCode = require('../models/registrationCodeModel');
const crypto = require('crypto');

// --- GESTION DES CODES D'INSCRIPTION ---

/**
 * @desc   [Admin] Générer un nouveau code d'invitation
 * @route  POST /api/admin/generate-code
 * @access Admin
 */
const generateRegistrationCode = async (req, res) => {
  const { role } = req.body;

  if (!role || (role !== 'delegue' && role !== 'superadmin')) {
    return res.status(400).json({ message: "Veuillez spécifier un rôle valide ('delegue' ou 'superadmin')." });
  }

  try {
    const randomBytes = crypto.randomBytes(4).toString('hex').toUpperCase();
    const codeString = `LOKO-${role.toUpperCase().substring(0, 3)}-${randomBytes}`;

    const newCode = await RegistrationCode.create({
      code: codeString,
      role: role,
      createdBy: req.user._id,
    });

    res.status(201).json({ message: 'Code généré avec succès.', code: newCode });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Erreur lors de la génération du code, veuillez réessayer.' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @desc   [Admin] Voir tous les codes d'invitation
 * @route  GET /api/admin/codes
 * @access Admin
 */
const getAllCodes = async (req, res) => {
  try {
    const codes = await RegistrationCode.find({}).populate('createdBy', 'email');
    res.status(200).json(codes);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @desc   [Admin] Supprimer un code d'invitation
 * @route  DELETE /api/admin/codes/:id
 * @access Admin
 */
const deleteCode = async (req, res) => {
  try {
    const code = await RegistrationCode.findById(req.params.id);

    if (!code) {
      return res.status(404).json({ message: 'Code non trouvé.' });
    }
    if (code.isUsed) {
      return res.status(400).json({ message: 'Impossible de supprimer un code déjà utilisé.' });
    }

    await code.deleteOne();
    res.status(200).json({ message: 'Code supprimé avec succès.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// --- GESTION DES UTILISATEURS ---

/**
 * @desc   [Admin] Voir tous les utilisateurs
 * @route  GET /api/admin/users
 * @access Admin
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};


// --- GESTION DES SESSIONS ---

/**
 * @desc   [Admin] Récupérer TOUTES les sessions
 * @route  GET /api/admin/sessions
 * @access Admin
 */
const getAllSessionsAdmin = async (req, res) => {
  try {
    const sessions = await Session.find({}).populate('createdBy', 'email').sort({ createdAt: -1 });
    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @desc   [Admin] Supprimer une session (Définitivement)
 * @route  DELETE /api/admin/sessions/:id
 * @access Admin
 */
const deleteSessionAdmin = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session non trouvée.' });
    }
    await Pairing.deleteMany({ sessionID: req.params.id });
    await session.deleteOne();
    res.status(200).json({ message: 'Session et historique supprimés.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @desc   [Admin] Activer/Désactiver une session (Toggle)
 * @route  PATCH /api/admin/sessions/:id/toggle-status
 * @access Admin
 */
const toggleSessionStatus = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session non trouvée.' });
    }

    // Bascule l'état
    session.isActive = !session.isActive;
    await session.save();

    res.status(200).json({ 
      message: `Session ${session.isActive ? 'activée' : 'désactivée'}.`, 
      session 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors du changement de statut.' });
  }
};

/**
 * @desc   [Admin] Mettre à jour les infos d'un parrain
 * @route  PUT /api/admin/sessions/:sessionId/sponsors/:sponsorId
 * @access Admin
 */
const updateSponsorInfo = async (req, res) => {
  const { sessionId, sponsorId } = req.params;
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ message: 'Nom et téléphone sont requis.' });
  }
  try {
    const updatedSession = await Session.findOneAndUpdate(
      { _id: sessionId, 'sponsors._id': sponsorId },
      { $set: { 'sponsors.$.name': name, 'sponsors.$.phone': phone } },
      { new: true }
    );
    if (!updatedSession) {
      return res.status(404).json({ message: 'Session ou Parrain non trouvé.' });
    }
    res.status(200).json({
      message: 'Informations du parrain mises à jour.',
      session: updatedSession,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour.' });
  }
};

module.exports = {
  generateRegistrationCode,
  getAllCodes,
  deleteCode,
  getAllUsers,
  getAllSessionsAdmin,
  deleteSessionAdmin,
  updateSponsorInfo,
  toggleSessionStatus, // NOUVEAU
};