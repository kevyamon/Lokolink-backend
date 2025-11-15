// controllers/pairingController.js

const Session = require('../models/sessionModel');
const Pairing = require('../models/pairingModel');

/**
 * @desc   Trouver un parrain pour un filleul
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
    
    session.sponsors.sort((a, b) => a.assignedCount - b.assignedCount);
    const assignedSponsor = session.sponsors[0];

    await Pairing.create({
      godchildName: godchildName.trim(),
      godchildGender: godchildGender,
      assignedSponsorName: assignedSponsor.name,
      assignedSponsorPhone: assignedSponsor.phone,
      sessionID: sessionID,
    });

    // On met à jour le compteur
    await Session.updateOne(
      { _id: sessionID, 'sponsors._id': assignedSponsor._id },
      { $inc: { 'sponsors.$.assignedCount': 1 } }
    );

    // SOCKET: Mise à jour importante (les compteurs changent)
    // On renvoie la session mise à jour pour que le dashboard s'actualise
    const updatedSession = await Session.findById(sessionID);
    req.io.emit('session:updated', updatedSession);

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