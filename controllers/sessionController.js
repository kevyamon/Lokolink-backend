// controllers/sessionController.js

const Session = require('../models/sessionModel');
const User = require('../models/userModel'); // Nécessaire pour la "Double-Clé"
const bcrypt = require('bcryptjs'); // Nécessaire pour la "Double-Clé"

/**
 * @desc   Créer une nouvelle session de parrainage
 * @route  POST /api/sessions/create
 * @access Délégué/Admin (Protégé par JWT)
 */
const createSession = async (req, res) => {
  // 'sessionCode' est maintenant requis (Phase 3)
  const { sessionName, sponsorsList, sessionCode } = req.body;

  if (!sessionName || !sponsorsList || !sessionCode) {
    return res
      .status(400)
      .json({ message: 'Nom de session, liste des parrains et Code LOKO requis.' });
  }

  try {
    const sessionExists = await Session.findOne({ sessionName });
    if (sessionExists) {
      return res
        .status(400)
        .json({ message: 'Une session avec ce nom existe déjà.' });
    }

    // Logique de Parsing (inchangée)
    const sponsorsArray = sponsorsList
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => {
        const parts = line.split(',');
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const phone = parts.slice(1).join(',').trim();
          return { name: name, phone: phone, assignedCount: 0 };
        }
        return null;
      })
      .filter((sponsor) => sponsor !== null);

    if (sponsorsArray.length === 0) {
      return res.status(400).json({
        message: 'La liste fournie ne contient aucun parrain valide.',
      });
    }

    // Création de la session
    const newSession = await Session.create({
      sessionName: sessionName,
      sessionCode: sessionCode, // Ajout du Code LOKO (Phase 3)
      sponsors: sponsorsArray,
      isActive: true,
      createdBy: req.user._id, // Ajout du créateur (Phase 2) - req.user vient du "garde" JWT
    });

    res.status(201).json({
      message: 'Session créée avec succès!',
      session: newSession,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Erreur serveur lors de la création de la session.',
    });
  }
};

/**
 * @desc   Supprimer (désactiver) une session
 * @route  DELETE /api/sessions/:id
 * @access Délégué/Admin (Protégé par JWT + "Double-Clé")
 */
const deleteSession = async (req, res) => {
  // Le 'password' de confirmation est maintenant requis (Plan P2)
  const { password } = req.body;
  const sessionID = req.params.id;

  if (!password) {
    return res
      .status(400)
      .json({ message: 'Le mot de passe de confirmation est requis.' });
  }

  try {
    const session = await Session.findById(sessionID);
    if (!session) {
      return res.status(404).json({ message: 'Session non trouvée.' });
    }

    // --- SÉCURITÉ "DOUBLE-CLÉ" (PLAN P2) ---

    // Vérification 1: L'utilisateur est-il le créateur OU un admin ?
    const isOwner = session.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'superadmin' || req.user.role === 'eternal';

    if (!isOwner && !isAdmin) {
      return res.status(401).json({ message: 'Non autorisé à supprimer cette session.' });
    }

    // Vérification 2: L'utilisateur confirme-t-il son identité ?
    const user = await User.findById(req.user._id);
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Mot de passe de confirmation incorrect.' });
    }
    
    // --- FIN DE LA SÉCURITÉ ---

    // Si les deux vérifications passent, on désactive
    session.isActive = false;
    await session.save();

    res.status(200).json({
      message: `La session "${session.sessionName}" a été désactivée.`,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression.' });
  }
};


// --- Fonctions Publiques (inchangées) ---
// Pas besoin de 'protect' ici, tout le monde peut voir les sessions

/**
 * @desc   Récupérer toutes les sessions actives
 * @route  GET /api/sessions/active
 * @access Public (Filleuls)
 */
const getActiveSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ isActive: true }).select('sessionName');
    res.status(200).json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @desc   Récupérer les détails d'une session (pour la page /session/:id)
 * @route  GET /api/sessions/:id
 * @access Public (Filleuls)
 */
const getSessionDetails = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (session && session.isActive) {
      res.status(200).json({
        _id: session._id,
        sessionName: session.sessionName,
      });
    } else if (session && !session.isActive) {
      // Gérer le cas où l'utilisateur était déjà dedans (Plan P5)
      res.status(404).json({ message: 'Cette session est terminée.' });
    } else {
      res.status(404).json({ message: 'Session non trouvée.' });
    }
  } catch (error) {
    res.status(404).json({ message: 'Session non trouvée.' });
  }
};


module.exports = {
  createSession,
  deleteSession,
  getActiveSessions,
  getSessionDetails,
};