// controllers/pairingController.js

const Session = require('../models/sessionModel');
const Pairing = require('../models/pairingModel');

/**
 * @desc   Trouver un parrain pour un filleul (ou le retrouver)
 * @route  POST /api/pairings/find
 * @access Public (Filleul)
 */
const findSponsor = async (req, res) => {
  // Le 'sessionCode' est maintenant requis (Phase 3)
  const { godchildName, godchildGender, sessionID, sessionCode } = req.body;

  if (!godchildName || !godchildGender || !sessionID || !sessionCode) {
    return res
      .status(400)
      .json({ message: 'Informations incomplètes (Nom, Genre, Session et Code LOKO).' });
  }

  try {
    // 1. Trouver la session
    const session = await Session.findById(sessionID);
    if (!session) {
      return res.status(404).json({ message: 'Cette session est introuvable.' });
    }

    // 2. VÉRIFICATION N°1 (PHASE 3) : Le Code LOKO est-il correct ?
    if (session.sessionCode !== sessionCode.trim()) {
      return res.status(401).json({ message: 'Code LOKO incorrect.' });
    }

    // 3. VÉRIFICATION N°2 (VOTRE P2) : La session est-elle active ?
    if (!session.isActive) {
      return res.status(403).json({ message: 'Cette session de parrainage est terminée.' });
    }

    // 4. VÉRIFICATION N°3 (MA P2) : Le filleul a-t-il DÉJÀ un parrain ?
    // (Normalisation du nom pour la recherche)
    const normalizedName = godchildName.toLowerCase().trim();
    const existingPairing = await Pairing.findOne({
      godchildName: { $regex: new RegExp('^' + normalizedName + '$', 'i') }, // Insensible à la casse
      sessionID: sessionID,
    });

    if (existingPairing) {
      // OUI -> On applique la logique "Retrouver son Parrain"
      return res.status(200).json({
        message: 'Parrain retrouvé !',
        sponsorName: existingPairing.assignedSponsorName,
        sponsorPhone: existingPairing.assignedSponsorPhone,
      });
    }

    // --- SI C'EST UN NOUVEAU FILLEUL ---

    // 5. LOGIQUE DE MATCHING "ROUND-ROBIN" (Inchangée)
    if (!session.sponsors || session.sponsors.length === 0) {
      return res.status(400).json({ message: 'Aucun parrain disponible dans cette session.' });
    }
    
    // A. Trier pour trouver le 'assignedCount' le plus bas
    session.sponsors.sort((a, b) => a.assignedCount - b.assignedCount);
    const assignedSponsor = session.sponsors[0];

    // 6. Créer le document "Pairing" (l'historique)
    const newPairing = await Pairing.create({
      godchildName: godchildName.trim(), // Sauvegarde du nom propre
      godchildGender: godchildGender,
      assignedSponsorName: assignedSponsor.name,
      assignedSponsorPhone: assignedSponsor.phone,
      sessionID: sessionID,
    });

    // 7. Incrémenter le 'assignedCount' de ce parrain DANS la DB
    await Session.updateOne(
      { _id: sessionID, 'sponsors._id': assignedSponsor._id },
      { $inc: { 'sponsors.$.assignedCount': 1 } }
    );

    // 8. Renvoyer le résultat au Frontend
    res.status(201).json({
      message: 'Parrain trouvé !',
      sponsorName: assignedSponsor.name,
      sponsorPhone: assignedSponsor.phone,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors du matching.' });
  }
};

module.exports = {
  findSponsor,
};