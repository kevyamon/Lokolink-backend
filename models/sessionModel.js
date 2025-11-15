// models/sessionModel.js

const mongoose = require('mongoose');

// Sous-schéma pour les parrains
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
    
    sessionCode: {
      type: String,
      required: [true, 'Veuillez définir un Code LOKO'],
      trim: true,
    },
    
    expectedGodchildCount: {
      type: Number,
      default: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// C'EST CETTE LIGNE QUI EST CRUCIALE :
module.exports = mongoose.model('Session', sessionSchema);