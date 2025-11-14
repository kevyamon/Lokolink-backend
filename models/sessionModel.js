// models/sessionModel.js

const mongoose = require('mongoose');

// C'est la structure d'un Parrain/Marraine DANS une session
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
    default: 0, // Le compteur démarre à 0
  },
});

// C'est la structure de la Session principale
const sessionSchema = new mongoose.Schema(
  {
    sessionName: {
      type: String,
      required: [true, 'Veuillez ajouter un nom de session'],
      trim: true,
      unique: true, // Garantit qu'on ne peut pas avoir deux sessions avec le même nom
    },
    isActive: {
      type: Boolean,
      default: true, // Une session est active dès sa création
    },
    sponsors: [sponsorSchema], // Un tableau d'objets suivant le schéma 'sponsorSchema'
  },
  {
    timestamps: true, // Ajoute createdAt et updatedAt
  }
);

module.exports = mongoose.model('Session', sessionSchema);  
