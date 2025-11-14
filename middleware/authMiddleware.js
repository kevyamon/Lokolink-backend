 // middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/userModel.js');

/**
 * Ce middleware vérifie le token JWT de l'utilisateur.
 * S'il est valide, il attache les infos de l'utilisateur à `req.user`.
 * Sinon, il bloque la requête.
 */
const protect = async (req, res, next) => {
  let token;

  // 1. Lire le token depuis l'en-tête "Authorization"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // 2. Extraire le token (format: "Bearer <token>")
      token = req.headers.authorization.split(' ')[1];

      // 3. Vérifier le token avec notre clé secrète
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 4. Récupérer l'utilisateur depuis la BDD (sans son mot de passe)
      // On attache l'utilisateur à l'objet 'req'
      req.user = await User.findById(decoded.id).select('-password');

      // 5. Vérifier si le compte est valide (non expiré, non désactivé)
      if (
        !req.user ||
        !req.user.isActive ||
        (req.user.accountExpiresAt && req.user.accountExpiresAt < new Date())
      ) {
        return res.status(401).json({ message: 'Accès non autorisé, compte invalide ou expiré.' });
      }

      // 6. Tout est bon, passer au prochain middleware/controller
      next();

    } catch (error) {
      console.error('Erreur de token:', error);
      res.status(401).json({ message: 'Non autorisé, token invalide.' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Non autorisé, aucun token fourni.' });
  }
};

/**
 * Ce middleware vérifie si l'utilisateur est un admin
 * (Doit être utilisé APRÈS le middleware 'protect')
 */
const admin = (req, res, next) => {
  if (req.user && (req.user.role === 'superadmin' || req.user.role === 'eternal')) {
    next(); // L'utilisateur est admin, on continue
  } else {
    res.status(401).json({ message: 'Accès non autorisé (Admin requis).' });
  }
};

module.exports = { protect, admin };
