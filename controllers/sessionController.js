// controllers/sessionController.js

const Session = require('../models/sessionModel');
const User = require('../models/userModel');

/**
 * @desc   Créer une nouvelle session de parrainage
 * @route  POST /api/sessions/create
 * @access Délégué/Admin
 */
const createSession = async (req, res) => {
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

    const newSession = await Session.create({
      sessionName: sessionName,
      sessionCode: sessionCode,
      sponsors: sponsorsArray,
      isActive: true,
      createdBy: req.user._id,
    });

    // SOCKET: Informer tout le monde qu'une nouvelle session est là
    req.io.emit('session:created', newSession);

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
 * @desc   Supprimer (désactiver) une session (Côté Délégué)
 * @route  DELETE /api/sessions/:id
 * @access Délégué/Admin
 */
const deleteSession = async (req, res) => {
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

    const isOwner = session.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'superadmin' || req.user.role === 'eternal';

    if (!isOwner && !isAdmin) {
      return res.status(401).json({ message: 'Non autorisé à supprimer cette session.' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Mot de passe de confirmation incorrect.' });
    }
    
    session.isActive = false;
    await session.save();

    // SOCKET: Informer que cette session a été modifiée (désactivée)
    req.io.emit('session:updated', session);

    res.status(200).json({
      message: `La session "${session.sessionName}" a été désactivée.`,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression.' });
  }
};

const getActiveSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ isActive: true }).select('sessionName');
    res.status(200).json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

const getSessionDetails = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (session && session.isActive) {
      res.status(200).json({
        _id: session._id,
        sessionName: session.sessionName,
      });
    } else if (session && !session.isActive) {
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