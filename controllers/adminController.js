// controllers/adminController.js

const Session = require('../models/sessionModel');
const Pairing = require('../models/pairingModel');
const User = require('../models/userModel');
const RegistrationCode = require('../models/registrationCodeModel');
const crypto = require('crypto');

// --- GESTION DES CODES ---

const generateRegistrationCode = async (req, res) => {
  const { role } = req.body;

  if (!role || (role !== 'delegue' && role !== 'superadmin')) {
    return res.status(400).json({ message: "Veuillez spécifier un rôle valide." });
  }

  try {
    const randomBytes = crypto.randomBytes(4).toString('hex').toUpperCase();
    const codeString = `LOKO-${role.toUpperCase().substring(0, 3)}-${randomBytes}`;

    const newCode = await RegistrationCode.create({
      code: codeString,
      role: role,
      createdBy: req.user._id,
    });

    // SOCKET: Nouveau code généré
    req.io.emit('code:created', newCode);

    res.status(201).json({ message: 'Code généré avec succès.', code: newCode });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Erreur génération, réessayez.' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

const getAllCodes = async (req, res) => {
  try {
    const codes = await RegistrationCode.find({}).populate('createdBy', 'email');
    res.status(200).json(codes);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

const deleteCode = async (req, res) => {
  try {
    const code = await RegistrationCode.findById(req.params.id);

    if (!code) {
      return res.status(404).json({ message: 'Code non trouvé.' });
    }
    if (code.isUsed) {
      return res.status(400).json({ message: 'Impossible de supprimer un code utilisé.' });
    }

    await code.deleteOne();
    
    // SOCKET: Code supprimé
    req.io.emit('code:deleted', req.params.id);

    res.status(200).json({ message: 'Code supprimé avec succès.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// --- GESTION DES UTILISATEURS ---

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// --- GESTION DES SESSIONS ---

const getAllSessionsAdmin = async (req, res) => {
  try {
    const sessions = await Session.find({}).populate('createdBy', 'email').sort({ createdAt: -1 });
    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

const deleteSessionAdmin = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session non trouvée.' });
    }
    await Pairing.deleteMany({ sessionID: req.params.id });
    await session.deleteOne();

    // SOCKET: Session supprimée définitivement
    req.io.emit('session:deleted', req.params.id);

    res.status(200).json({ message: 'Session et historique supprimés.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

const toggleSessionStatus = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session non trouvée.' });
    }

    session.isActive = !session.isActive;
    await session.save();

    // SOCKET: Statut mis à jour
    req.io.emit('session:updated', session);

    res.status(200).json({ 
      message: `Session ${session.isActive ? 'activée' : 'désactivée'}.`, 
      session 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

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

    // SOCKET: Session mise à jour (infos parrain)
    req.io.emit('session:updated', updatedSession);

    res.status(200).json({
      message: 'Informations du parrain mises à jour.',
      session: updatedSession,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
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
  toggleSessionStatus,
};