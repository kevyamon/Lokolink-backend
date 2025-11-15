// models/sessionModel.js

const mongoose = require('mongoose');

// Sous-schéma pour les parrains (inchangé)
const sponsorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  assignedCount: {
    type: Number,
    required: true,
    default: 0,
  },
});

// Schéma principal de la Session
const sessionSchema = new mongoose.Schema(
  {
    sessionName: {
      type: String,
      required: [true, 'Veuillez ajouter un nom de session'],
      trim: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sponsors: [sponsorSchema],

    // --- AJOUTS DE LA MISE À NIVEAU ---

    // Le "Code LOKO" secret pour les filleuls
    sessionCode: {
      type: String,
      required: [true, 'Veuillez définir un Code LOKO pour cette session'],
      trim: true,
    },
    
    // NOUVEAU : Estimation pour l'algorithme de Binôme
    expectedGodchildCount: {
      type: Number,
      default: 0, // Si 0, on considère que c'est égal au nombre de parrains (ratio 1:1)
    },

    // Le lien vers le créateur (Délégué/Admin)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User', // Référence à notre 'userModel'
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Session', sessionSchema);