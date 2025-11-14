 // controllers/pairingController.js

const Session = require('../models/sessionModel');
const Pairing = require('../models/pairingModel');

/**
 * @desc   Trouver un parrain pour un filleul (Logique de Matching)
 * @route  POST /api/pairings/find
 * @access Public (Filleul)
 */
const findSponsor = async (req, res) => {
  const { godchildName, godchildGender, sessionID } = req.body;

  // 1. Validation des entrées
  if (!godchildName || !godchildGender || !sessionID) {
    return res
      .status(400)
      .json({ message: 'Informations incomplètes (Nom, Genre, Session).' });
  }

  try {
    // 2. Vérifier si la session existe et est active
    const session = await Session.findById(sessionID);
    if (!session || !session.isActive) {
      return res.status(404).json({ message: 'Cette session est introuvable ou terminée.' });
    }

    // 3. LOGIQUE DE CONTRÔLE ANTI-DOUBLON (Partie 4)
    // On normalise le nom en minuscule et sans espaces pour la comparaison
    const normalizedName = godchildName.toLowerCase().trim();
    
    const existingPairing = await Pairing.findOne({
      // Recherche si le nom existe déjà DANS CETTE SESSION
      godchildName: { $regex: new RegExp('^' + normalizedName + '$', 'i') }, // Recherche insensible à la casse
      sessionID: sessionID,
    });

    if (existingPairing) {
      return res
        .status(400)
        .json({ message: 'Vous avez déjà un parrain pour cette session.' });
    }

    // 4. LOGIQUE DE MATCHING "ROUND-ROBIN" (Partie 3)

    // S'assurer qu'il y a des parrains
    if (!session.sponsors || session.sponsors.length === 0) {
      return res.status(400).json({ message: 'Aucun parrain disponible dans cette session.' });
    }

    // A. Trouver le 'assignedCount' le plus bas
    // On trie le tableau des parrains par 'assignedCount' croissant (du plus bas au plus haut)
    session.sponsors.sort((a, b) => a.assignedCount - b.assignedCount);

    // B. Sélectionner le premier parrain de la liste triée
    const assignedSponsor = session.sponsors[0];

    // 5. Créer le document "Pairing" (l'historique)
    const newPairing = await Pairing.create({
      godchildName: godchildName.trim(), // On sauvegarde le nom propre
      godchildGender: godchildGender, // 'Homme' ou 'Femme'
      assignedSponsorName: assignedSponsor.name,
      assignedSponsorPhone: assignedSponsor.phone,
      sessionID: sessionID,
    });

    // 6. Incrémenter le 'assignedCount' de ce parrain DANS la DB
    // C'est l'étape la plus importante
    await Session.updateOne(
      { _id: sessionID, 'sponsors._id': assignedSponsor._id },
      { $inc: { 'sponsors.$.assignedCount': 1 } }
    );

    // 7. Renvoyer le résultat au Frontend
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
