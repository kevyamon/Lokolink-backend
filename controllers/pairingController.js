// controllers/pairingController.js

const Session = require('../models/sessionModel');
const Pairing = require('../models/pairingModel');

/**
 * @desc   Trouver un parrain pour un filleul (Algorithme Binôme Dynamique)
 * @route  POST /api/pairings/find
 * @access Public
 */
const findSponsor = async (req, res) => {
  const { godchildName, godchildGender, sessionID, sessionCode } = req.body;

  if (!godchildName || !godchildGender || !sessionID || !sessionCode) {
    return res
      .status(400)
      .json({ message: 'Informations incomplètes.' });
  }

  try {
    const session = await Session.findById(sessionID);
    if (!session) {
      return res.status(404).json({ message: 'Cette session est introuvable.' });
    }

    if (session.sessionCode !== sessionCode.trim()) {
      return res.status(401).json({ message: 'Code LOKO incorrect.' });
    }

    if (!session.isActive) {
      return res.status(403).json({ message: 'Cette session de parrainage est terminée.' });
    }

    // 1. Vérifier si déjà parrainé (Idempotence)
    const normalizedName = godchildName.toLowerCase().trim();
    const existingPairing = await Pairing.findOne({
      godchildName: { $regex: new RegExp('^' + normalizedName + '$', 'i') },
      sessionID: sessionID,
    });

    if (existingPairing) {
      return res.status(200).json({
        message: 'Parrain retrouvé !',
        sponsorName: existingPairing.assignedSponsorName,
        sponsorPhone: existingPairing.assignedSponsorPhone,
      });
    }

    if (!session.sponsors || session.sponsors.length === 0) {
      return res.status(400).json({ message: 'Aucun parrain disponible.' });
    }
    
    // --- ALGORITHME DE BINÔME INTELLIGENT ---

    // On trie toujours par 'assignedCount' ascendant pour équilibrer
    session.sponsors.sort((a, b) => a.assignedCount - b.assignedCount);

    // Calcul du Surplus pour déterminer si on fait un Duo
    const totalSponsors = session.sponsors.length;
    // Si expectedGodchildCount est null/0 (anciennes sessions), on fallback sur totalSponsors (pas de surplus)
    const expectedGodchildren = session.expectedGodchildCount || totalSponsors;
    
    // Combien de parrains en trop ?
    const surplus = Math.max(0, totalSponsors - expectedGodchildren);
    
    // Combien de filleuls sont déjà passés ? (Rang actuel)
    const currentRank = await Pairing.countDocuments({ sessionID: sessionID });

    let assignedSponsorName = "";
    let assignedSponsorPhone = "";
    const sponsorsToUpdate = [];

    // LOGIQUE DÉCISIVE :
    // Si le rang actuel est inférieur au surplus, cela signifie qu'on est dans la phase
    // où on doit "absorber" le surplus en créant des duos.
    // Ex: 50 parrains, 40 attendus -> Surplus 10.
    // Les 10 premiers filleuls (rang 0 à 9) prendront 2 parrains.
    // On vérifie aussi qu'il reste au moins 2 parrains disponibles dans la liste.
    const triggerDuo = (currentRank < surplus) && (session.sponsors.length >= 2);

    if (triggerDuo) {
      // MODE DUO (Binôme)
      const sponsor1 = session.sponsors[0];
      const sponsor2 = session.sponsors[1];

      assignedSponsorName = `${sponsor1.name} & ${sponsor2.name}`;
      assignedSponsorPhone = `${sponsor1.phone} / ${sponsor2.phone}`;
      
      sponsorsToUpdate.push(sponsor1, sponsor2);
    } else {
      // MODE SOLO (Classique)
      const sponsor1 = session.sponsors[0];
      
      assignedSponsorName = sponsor1.name;
      assignedSponsorPhone = sponsor1.phone;
      
      sponsorsToUpdate.push(sponsor1);
    }

    // Enregistrement du Pairing
    await Pairing.create({
      godchildName: godchildName.trim(),
      godchildGender: godchildGender,
      assignedSponsorName: assignedSponsorName,
      assignedSponsorPhone: assignedSponsorPhone,
      sessionID: sessionID,
    });

    // Mise à jour des compteurs pour les parrains sélectionnés
    // On utilise une boucle pour gérer le cas Solo ou Duo de la même façon
    for (const sponsor of sponsorsToUpdate) {
      await Session.updateOne(
        { _id: sessionID, 'sponsors._id': sponsor._id },
        { $inc: { 'sponsors.$.assignedCount': 1 } }
      );
    }

    // SOCKET: Mise à jour importante
    const updatedSession = await Session.findById(sessionID);
    req.io.emit('session:updated', updatedSession);

    res.status(201).json({
      message: triggerDuo ? 'Binôme de parrains trouvé !' : 'Parrain trouvé !',
      sponsorName: assignedSponsorName,
      sponsorPhone: assignedSponsorPhone,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors du matching.' });
  }
};

module.exports = {
  findSponsor,
};