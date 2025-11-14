  // models/pairingModel.js

const mongoose = require('mongoose');

const pairingSchema = new mongoose.Schema(
  {
    godchildName: {
      type: String,
      required: true,
    },
    godchildGender: {
      type: String,
      required: true,
      enum: ['Homme', 'Femme'], // Accepte uniquement ces deux valeurs
    },
    assignedSponsorName: {
      type: String,
      required: true,
    },
    assignedSponsorPhone: {
      type: String,
      required: true,
    },
    // Ceci est la référence à la session à laquelle ce binômage appartient
    sessionID: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Session', // 'ref' pointe vers le modèle 'Session'
    },
  },
  {
    timestamps: true, // Ajoute createdAt et updatedAt
  }
);

module.exports = mongoose.model('Pairing', pairingSchema);
