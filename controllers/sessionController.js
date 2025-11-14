// controllers/sessionController.js

const Session = require('../models/sessionModel');

/**
 * @desc   Créer une nouvelle session de parrainage
 * @route  POST /api/sessions/create
 * @access Délégué
 */
const createSession = async (req, res) => {
  // ... (votre code existant pour createSession)
  const { sessionName, sponsorsList } = req.body;

  // 1. Validation de base
  if (!sessionName || !sponsorsList) {
    return res
      .status(400)
      .json({ message: 'Nom de session et liste des parrains requis.' });
  }

  try {
    // 2. Vérifier si une session avec ce nom existe déjà
    const sessionExists = await Session.findOne({ sessionName });
    if (sessionExists) {
      return res
        .status(400)
        .json({ message: 'Une session avec ce nom existe déjà.' });
    }

    // 3. LOGIQUE DE PARSING (Votre cahier des charges)
    const sponsorsArray = sponsorsList
      .split('\n') // Sépare chaque ligne
      .filter((line) => line.trim() !== '') // Supprime les lignes vides
      .map((line) => {
        const parts = line.split(','); // Sépare Nom et Téléphone par la virgule

        if (parts.length >= 2) {
          const name = parts[0].trim();
          const phone = parts.slice(1).join(',').trim(); // Au cas où le tel contient une virgule

          return {
            name: name,
            phone: phone,
            assignedCount: 0, // Initialisé à 0
          };
        }
        return null; // Si la ligne est mal formatée, elle sera filtrée
      })
      .filter((sponsor) => sponsor !== null); // Nettoie les lignes mal formatées

    // 4. Vérifier si on a au moins un parrain valide
    if (sponsorsArray.length === 0) {
      return res.status(400).json({
        message:
          'La liste fournie ne contient aucun parrain valide. Format attendu : Nom, Téléphone',
      });
    }

    // 5. Créer la session
    const newSession = await Session.create({
      sessionName: sessionName,
      sponsors: sponsorsArray,
      isActive: true, // Active par défaut
    });

    res.status(201).json({
      message: 'Session créée avec succès!',
      session: newSession,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message:
        'Erreur serveur lors de la création de la session. Vérifiez vos données.',
    });
  }
};

// =============================================
// NOUVELLES FONCTIONS À AJOUTER
// =============================================

/**
 * @desc   Récupérer toutes les sessions actives
 * @route  GET /api/sessions/active
 * @access Public (Filleuls)
 */
const getActiveSessions = async (req, res) => {
  try {
    // On cherche les sessions actives, on ne retourne que le nom et l'ID
    const sessions = await Session.find({ isActive: true }).select(
      'sessionName'
    );
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
    } else {
      res.status(404).json({ message: 'Session non trouvée ou inactive.' });
    }
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: 'Session non trouvée.' });
  }
};


// =============================================
// NOUVELLE FONCTION À AJOUTER
// =============================================

/**
 * @desc   Supprimer (désactiver) une session
 * @route  DELETE /api/sessions/:id
 * @access Délégué (protégé par mot de passe)
 */
const deleteSession = async (req, res) => {
  const { password } = req.body;
  const sessionID = req.params.id;

  // 1. Vérifier si le mot de passe Délégué a été fourni
  if (!password) {
    return res
      .status(400)
      .json({ message: 'Le mot de passe de confirmation est requis.' });
  }

  // 2. Vérifier si le mot de passe est correct
  if (password !== process.env.DELEGUE_PASSWORD) {
    return res.status(401).json({ message: 'Mot de passe incorrect.' });
  }

  try {
    // 3. Trouver la session et la "supprimer" (la désactiver)
    const session = await Session.findByIdAndUpdate(
      sessionID,
      { isActive: false }, // La modification à appliquer
      { new: true } // Pour que la requête retourne le document mis à jour
    );

    if (!session) {
      return res.status(404).json({ message: 'Session non trouvée.' });
    }

    res.status(200).json({
      message: `La session "${session.sessionName}" a été désactivée avec succès.`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression.' });
  }
};

module.exports = {
  createSession,
  getActiveSessions, // A AJOUTER
  getSessionDetails, // A AJOUTER
  deleteSession,
};