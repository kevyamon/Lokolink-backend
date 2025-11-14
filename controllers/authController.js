// controllers/authController.js

const User = require('../models/userModel');
const RegistrationCode = require('../models/registrationCodeModel');
const generateToken = require('../utils/generateToken');

/**
 * @desc   Inscrire un utilisateur (Délégué ou SuperAdmin) avec un code
 * @route  POST /api/auth/register
 * @access Public
 */
const registerUser = async (req, res) => {
  const { email, password, registrationCode } = req.body;

  try {
    // 1. Vérifier si le code d'inscription est valide
    const codeDoc = await RegistrationCode.findOne({ code: registrationCode });

    if (!codeDoc) {
      return res.status(400).json({ message: "Code d'inscription invalide." });
    }

    // 2. Vérifier si le code a déjà été utilisé
    if (codeDoc.isUsed) {
      return res.status(400).json({ message: 'Ce code a déjà été utilisé.' });
    }

    // 3. Vérifier si l'email est déjà pris
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }

    // 4. Définir la date d'expiration (9 mois)
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 9);

    // 5. Créer l'utilisateur
    const user = await User.create({
      email,
      password,
      role: codeDoc.role, // Le rôle est défini par le code
      accountExpiresAt: expirationDate, // Compte à rebours de 9 mois
    });

    // 6. "Brûler" le code d'inscription
    codeDoc.isUsed = true;
    await codeDoc.save();

    // 7. Connecter l'utilisateur et renvoyer le token
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
};

/**
 * @desc   Inscrire le tout premier admin "Eternal"
 * @route  POST /api/auth/register-eternal
 * @access Public (mais protégé par la clé .env)
 */
const registerEternalAdmin = async (req, res) => {
  const { email, password, eternalKey } = req.body;

  // 1. Vérifier la "Clé Maîtresse"
  if (eternalKey !== process.env.ETERNAL_ADMIN_KEY) {
    return res.status(401).json({ message: 'Clé Maîtresse incorrecte.' });
  }

  // 2. Vérifier si l'email est déjà pris
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
  }

  // 3. Créer l'utilisateur "Eternal"
  const user = await User.create({
    email,
    password,
    role: 'eternal',
    // Pas de 'accountExpiresAt' pour le rôle eternal
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
 * @access Public
 */
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Trouver l'utilisateur par email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // 2. Vérifier le mot de passe avec bcrypt
    const isMatch = await user.matchPassword(enteredPassword);

    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // 3. Vérifier si le compte est actif et non expiré
    if (!user.isActive) {
      return res.status(401).json({ message: 'Ce compte a été désactivé.' });
    }
    
    // Si ce n'est PAS un 'eternal', on vérifie la date
    if (user.role !== 'eternal' && user.accountExpiresAt && user.accountExpiresAt < new Date()) {
       return res.status(401).json({ message: 'Ce compte a expiré. Veuillez contacter un administrateur.' });
    }

    // 4. Tout est bon : renvoyer le token JWT
    res.status(200).json({
      _id: user._id,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });

  } catch (error) {
     // Gérer l'erreur si le mot de passe est vide ou mal formaté par bcrypt
     if (error.name === 'TypeError' && error.message.includes('data and hash arguments required')) {
        return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
     }
     console.error(error);
     res.status(500).json({ message: 'Erreur serveur.' });
  }
};


// On exporte les nouvelles fonctions
module.exports = {
  registerUser,
  registerEternalAdmin,
  loginUser,
};