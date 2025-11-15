// controllers/sessionController.js

const Session = require('../models/sessionModel');
const User = require('../models/userModel');

/**
 * @desc   Créer une nouvelle session
 * @route  POST /api/sessions/create
 */
const createSession = async (req, res) => {
  const { sessionName, sessionCode, expectedGodchildCount, sponsorsList } = req.body;

  if (!sessionName || !sessionCode) {
    return res.status(400).json({ message: 'Le Nom et le Code LOKO sont requis.' });
  }

  try {
    const sessionExists = await Session.findOne({ sessionName });
    if (sessionExists) return res.status(400).json({ message: 'Nom déjà utilisé.' });

    let sponsorsArray = [];
    if (sponsorsList && sponsorsList.trim() !== '') {
       sponsorsArray = sponsorsList.split('\n').filter(l => l.trim() !== '').map(l => {
          const parts = l.split(',');
          if (parts.length >= 2) return { name: parts[0].trim(), phone: parts.slice(1).join(',').trim(), assignedCount: 0 };
          return null;
        }).filter(s => s !== null);
    }

    const finalExpectedCount = expectedGodchildCount ? parseInt(expectedGodchildCount) : 0;

    const newSession = await Session.create({
      sessionName: sessionName,
      sessionCode: sessionCode,
      expectedGodchildCount: finalExpectedCount,
      sponsors: sponsorsArray,
      isActive: true,
      createdBy: req.user._id,
    });

    if (req.io) req.io.emit('session:created', newSession);

    res.status(201).json({ message: 'Session créée !', session: newSession });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @desc   Récupérer TOUTES les sessions du délégué connecté
 * @route  GET /api/sessions/my-sessions
 * @access Délégué
 */
const getMySessions = async (req, res) => {
  try {
    // On cherche toutes les sessions créées par cet utilisateur
    // On trie par date de création (la plus récente en haut)
    const sessions = await Session.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @desc   Récupérer UNE session spécifique (Détail)
 * @route  GET /api/sessions/my-session/:id
 */
const getMySession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session introuvable.' });
    
    if (session.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'superadmin' && req.user.role !== 'eternal') {
      return res.status(401).json({ message: 'Non autorisé.' });
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @desc   Désactiver une session (Soft Delete pour Admin, "Suppression" pour Délégué)
 * @route  DELETE /api/sessions/:id
 */
const deleteSession = async (req, res) => {
  // Note : Le délégué n'a plus besoin de mot de passe ici s'il est déjà connecté sur son dashboard
  // Mais gardons la vérification si le mot de passe est envoyé
  const sessionID = req.params.id;

  try {
    const session = await Session.findById(sessionID);
    if (!session) return res.status(404).json({ message: 'Session introuvable.' });

    const isOwner = session.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'superadmin' || req.user.role === 'eternal';

    if (!isOwner && !isAdmin) return res.status(401).json({ message: 'Non autorisé.' });

    // Désactivation (Soft Delete)
    // Pour le SuperAdmin, c'est une désactivation.
    // Pour le délégué, visuellement ce sera comme une suppression (filtré plus tard ou marqué "Terminé")
    session.isActive = false;
    await session.save();

    if (req.io) req.io.emit('session:updated', session);

    res.status(200).json({ message: `Session désactivée.` });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ... (Le reste des fonctions publiques ne change pas) ...

const getActiveSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ isActive: true }).select('sessionName');
    res.status(200).json(sessions);
  } catch (error) { res.status(500).json({ message: 'Erreur serveur.' }); }
};

const getSessionDetails = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (session && session.isActive) res.status(200).json({ _id: session._id, sessionName: session.sessionName });
    else res.status(404).json({ message: 'Session introuvable ou terminée.' });
  } catch (error) { res.status(404).json({ message: 'Session introuvable.' }); }
};

const joinSession = async (req, res) => {
  const { sessionCode, name, phone } = req.body;
  if (!sessionCode || !name || !phone) return res.status(400).json({ message: 'Infos manquantes.' });

  try {
    const session = await Session.findOne({ sessionCode: sessionCode.trim() });
    if (!session || !session.isActive) return res.status(404).json({ message: 'Session introuvable ou fermée.' });
    if (session.sponsors.find(s => s.phone.replace(/\s/g,'') === phone.replace(/\s/g,''))) return res.status(400).json({ message: 'Déjà inscrit !' });

    const newSponsor = { name: name.trim(), phone: phone.trim(), assignedCount: 0 };
    session.sponsors.push(newSponsor);
    await session.save();
    if (req.io) req.io.emit('session:updated', session);
    res.status(200).json({ message: 'Inscription validée !', sessionName: session.sessionName, sponsor: newSponsor });
  } catch (error) { res.status(500).json({ message: 'Erreur inscription.' }); }
};

const verifySessionPassword = async (req, res) => {
  // Gardons cette fonction au cas où, même si on passe par le login principal maintenant
  const { password, sessionId } = req.body;
  if (!password || !sessionId) return res.status(400).json({ message: 'Données manquantes.' });
  try {
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Introuvable.' });
    if (session.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'superadmin' && req.user.role !== 'eternal') return res.status(403).json({ message: 'Interdit.' });
    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(password))) return res.status(401).json({ message: 'Mot de passe incorrect.' });
    res.status(200).json({ message: 'OK' });
  } catch (error) { res.status(500).json({ message: 'Erreur.' }); }
};

module.exports = {
  createSession,
  getMySessions, // <--- AJOUTÉ (Pluriel)
  getMySession,  // (Singulier - détail)
  deleteSession,
  getActiveSessions,
  getSessionDetails,
  joinSession,
  verifySessionPassword,
};