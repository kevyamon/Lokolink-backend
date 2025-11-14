  // controllers/adminController.js

const Session = require('../models/sessionModel');
const Pairing = require('../models/pairingModel');

/**
 * @desc   [Admin] Récupérer TOUTES les sessions (actives et inactives)
 * @route  GET /api/admin/sessions
 * @access Super-Admin
 */
const getAllSessionsAdmin = async (req, res) => {
  try {
    // On récupère tout, en triant par la plus récente
    const sessions = await Session.find({}).sort({ createdAt: -1 });
    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @desc   [Admin] Récupérer les détails complets d'une session pour édition
 * @route  GET /api/admin/sessions/:id
 * @access Super-Admin
 */
const getSessionDetailsAdmin = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session non trouvée.' });
    }
    // Renvoie la session complète, y compris l'array 'sponsors'
    res.status(200).json(session);
  } catch (error) {
    res.status(404).json({ message: 'Session non trouvée (ID mal formaté).' });
  }
};

/**
 * @desc   [Admin] Mettre à jour les infos d'un parrain (Partie 6 - Édition)
 * @route  PUT /api/admin/sessions/:sessionId/sponsors/:sponsorId
 * @access Super-Admin
 */
const updateSponsorInfo = async (req, res) => {
  const { sessionId, sponsorId } = req.params;
  const { name, phone } = req.body; // Nouvelles infos

  if (!name || !phone) {
    return res
      .status(400)
      .json({ message: 'Nom et téléphone sont requis.' });
  }

  try {
    // On met à jour le sous-document 'sponsor' directement dans la DB
    const updatedSession = await Session.findOneAndUpdate(
      { _id: sessionId, 'sponsors._id': sponsorId },
      {
        $set: {
          'sponsors.$.name': name,
          'sponsors.$.phone': phone,
        },
      },
      { new: true } // Renvoie la session mise à jour
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

/**
 * @desc   [Admin] Supprimer une session (Suppression DÉFINITIVE)
 * @route  DELETE /api/admin/sessions/:id
 * @access Super-Admin
 */
const deleteSessionAdmin = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session non trouvée.' });
    }

    // 1. Suppression définitive de la session
    await Session.findByIdAndDelete(req.params.id);

    // 2. (Optionnel mais propre) Supprimer tous les binômes liés
    await Pairing.deleteMany({ sessionID: req.params.id });

    res
      .status(200)
      .json({ message: 'Session et historique des binômes supprimés.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

module.exports = {
  getAllSessionsAdmin,
  getSessionDetailsAdmin,
  updateSponsorInfo,
  deleteSessionAdmin,
};
