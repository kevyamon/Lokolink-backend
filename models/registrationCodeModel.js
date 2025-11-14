  // models/registrationCodeModel.js

const mongoose = require('mongoose');

const registrationCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ['delegue', 'superadmin'],
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    // On peut ajouter un 'createdBy' pour savoir quel admin a créé le code
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  },
  {
    timestamps: true, // Pour savoir quand le code a été créé
  }
);

module.exports = mongoose.model('RegistrationCode', registrationCodeSchema);
