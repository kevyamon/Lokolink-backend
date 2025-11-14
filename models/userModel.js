  // models/userModel.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Veuillez entrer un email'],
      unique: true,
      lowercase: true,
      trim: true,
      // Regex simple pour valider le format email
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Veuillez entrer un email valide',
      ],
    },
    password: {
      type: String,
      required: [true, 'Veuillez entrer un mot de passe'],
      minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    },
    role: {
      type: String,
      enum: ['delegue', 'superadmin', 'eternal'], // Nos 3 niveaux d'accès
      required: true,
    },
    accountExpiresAt: {
      type: Date, // Sera null pour 'eternal'
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// HOOK (Middleware Mongoose): Crypter le mot de passe AVANT de sauvegarder
userSchema.pre('save', async function (next) {
  // On ne re-crypte pas le mdp si on modifie juste l'email
  if (!this.isModified('password')) {
    return next();
  }

  // Générer le "sel" (force 10)
  const salt = await bcrypt.genSalt(10);
  // Hacher le mot de passe avec le sel
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Méthode personnalisée : Comparer le mot de passe tapé avec celui de la BDD
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
