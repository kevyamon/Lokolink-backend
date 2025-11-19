// controllers/authController.js

const User = require('../models/userModel');
const RegistrationCode = require('../models/registrationCodeModel');
const generateToken = require('../utils/generateToken');
const { Mutex } = require('async-mutex'); 

const registrationMutex = new Mutex();

// Regex pour mot de passe fort : Min 6 char, 1 majuscule, 1 chiffre
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;

/**
 * @desc   Inscrire un utilisateur (Délégué ou SuperAdmin) avec un code
 * @route  POST /api/auth/register
 */
const registerUser = async (req, res) => {
  const { email, password, registrationCode } = req.body;

  // Validation Force Mot de Passe
  if (!password || !passwordRegex.test(password)) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères, dont une lettre et un chiffre.' });
  }

  await registrationMutex.runExclusive(async () => {
    try {
      const codeDoc = await RegistrationCode.findOne({ code: registrationCode });

      if (!codeDoc) {
        return res.status(400).json({ message: "Code d'inscription invalide." });
      }

      if (codeDoc.isUsed) {
        return res.status(400).json({ message: 'Ce code a déjà été utilisé.' });
      }

      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
      }

      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 9);

      const user = await User.create({
        email,
        password,
        role: codeDoc.role, 
        accountExpiresAt: expirationDate, 
      });

      codeDoc.isUsed = true;
      await codeDoc.save();

      if (user) {
        res.status(201).json({
          _id: user._id,
          email: user.email,
          role: user.role,
          token: generateToken(user._id, user.role),
        });
      } else {
        res.status(400).json({ message: 'Données utilisateur invalides.' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  }); 
};

/**
 * @desc   Inscrire le tout premier admin "Eternal"
 * @route  POST /api/auth/register-eternal
 */
const registerEternalAdmin = async (req, res) => {
  const { email, password, eternalKey } = req.body;

  if (eternalKey !== process.env.ETERNAL_ADMIN_KEY) {
    return res.status(401).json({ message: 'Clé Maîtresse incorrecte.' });
  }

  if (!password || !passwordRegex.test(password)) {
    return res.status(400).json({ message: 'Le mot de passe est trop faible.' });
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
  }

  const user = await User.create({
    email,
    password,
    role: 'eternal',
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } else {
    res.status(400).json({ message: 'Données invalides.' });
  }
};

/**
 * @desc   Connecter un utilisateur (Login)
 * @route  POST /api/auth/login
 */
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    // Protection contre l'énumération d'utilisateurs : message générique
    if (!user) {
      // Petit délai pour simuler un temps de calcul
      await new Promise(resolve => setTimeout(resolve, 200)); 
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Ce compte a été désactivé.' });
    }
    
    if (user.role !== 'eternal' && user.accountExpiresAt && user.accountExpiresAt < new Date()) {
       return res.status(401).json({ message: 'Ce compte a expiré. Veuillez contacter un administrateur.' });
    }

    res.status(200).json({
      _id: user._id,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });

  } catch (error) {
     if (error.name === 'TypeError' && error.message.includes('data and hash arguments required')) {
        return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
     }
     console.error(error);
     res.status(500).json({ message: 'Erreur serveur.' });
  }
};

module.exports = {
  registerUser,
  registerEternalAdmin,
  loginUser,
};