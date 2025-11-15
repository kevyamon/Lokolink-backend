// controllers/sessionController.js

const Session = require('../models/sessionModel');
const User = require('../models/userModel');

/**
 * @desc   Créer une nouvelle session de parrainage (Version Invitation)
 * @route  POST /api/sessions/create
 * @access Délégué/Admin
 */
const createSession = async (req, res) => {
  // On retire 'sponsorsList' des champs OBLIGATOIRES
  const { sessionName, sessionCode, expectedGodchildCount, sponsorsList } = req.body;

  // Validation allégée
  if (!sessionName || !sessionCode) {
    return res
      .status(400)
      .json({ message: 'Le Nom de la session et le Code LOKO sont requis.' });
  }

  try {
    const sessionExists = await Session.findOne({ sessionName });
    if (sessionExists) {
      return res
        .status(400)
        .json({ message: 'Une session avec ce nom existe déjà.' });
    }

    // Gestion de la liste initiale (optionnelle maintenant)
    let sponsorsArray = [];
    
    if (sponsorsList && sponsorsList.trim() !== '') {
       sponsorsArray = sponsorsList
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
    }

    // Si l'utilisateur n'a pas mis d'estimation, on met 0 par défaut
    const finalExpectedCount = expectedGodchildCount ? parseInt(expectedGodchildCount) : 0;

    const newSession = await Session.create({
      sessionName: sessionName,
      sessionCode: sessionCode,
      expectedGodchildCount: finalExpectedCount,
      sponsors: sponsorsArray, // Peut être vide []
      isActive: true,
      createdBy: req.user._id,
    });

    // SOCKET
    if (req.io) {
        req.io.emit('session:created', newSession);
    }

    res.status(201).json({
      message: 'Session créée ! Vous pouvez maintenant inviter les parrains.',
      session: newSession,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Erreur serveur lors de la création de la session.',
    });
  }
};

// ... (Le reste ne change pas, je remets tout pour le copier-coller facile) ...

const getMySession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session introuvable.' });
    }

    if (session.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'superadmin' && req.user.role !== 'eternal') {
      return res.status(401).json({ message: 'Non autorisé.' });
    }

    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

const deleteSession = async (req, res) => {
  const { password } = req.body;
  const sessionID = req.params.id;

  if (!password) {
    return res.status(400).json({ message: 'Mot de passe requis.' });
  }

  try {
    const session = await Session.findById(sessionID);
    if (!session) return res.status(404).json({ message: 'Session introuvable.' });

    const isOwner = session.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'superadmin' || req.user.role === 'eternal';

    if (!isOwner && !isAdmin) return res.status(401).json({ message: 'Non autorisé.' });

    const user = await User.findById(req.user._id);
    const isMatch = await user.matchPassword(password);

    if (!isMatch) return res.status(401).json({ message: 'Mot de passe incorrect.' });
    
    session.isActive = false;
    await session.save();

    if (req.io) req.io.emit('session:updated', session);

    res.status(200).json({ message: `Session désactivée.` });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

const getActiveSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ isActive: true }).select('sessionName');
    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

const getSessionDetails = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (session && session.isActive) {
      res.status(200).json({ _id: session._id, sessionName: session.sessionName });
    } else {
      res.status(404).json({ message: 'Session introuvable ou terminée.' });
    }
  } catch (error) {
    res.status(404).json({ message: 'Session introuvable.' });
  }
};

const joinSession = async (req, res) => {
  const { sessionCode, name, phone } = req.body;

  if (!sessionCode || !name || !phone) {
    return res.status(400).json({ message: 'Infos manquantes.' });
  }

  try {
    const session = await Session.findOne({ sessionCode: sessionCode.trim() });

    if (!session) return res.status(404).json({ message: 'Code invalide.' });
    if (!session.isActive) return res.status(400).json({ message: 'Session fermée.' });

    const sponsorExists = session.sponsors.find(
      (s) => s.phone.replace(/\s/g, '') === phone.replace(/\s/g, '')
    );

    if (sponsorExists) return res.status(400).json({ message: 'Déjà inscrit !' });

    const newSponsor = { name: name.trim(), phone: phone.trim(), assignedCount: 0 };

    session.sponsors.push(newSponsor);
    await session.save();

    if (req.io) req.io.emit('session:updated', session);

    res.status(200).json({ message: 'Inscription validée !', sessionName: session.sessionName, sponsor: newSponsor });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur inscription.' });
  }
};

module.exports = {
  createSession,
  getMySession,
  deleteSession,
  getActiveSessions,
  getSessionDetails,
  joinSession,
};