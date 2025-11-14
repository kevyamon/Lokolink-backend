  // controllers/authController.js

/**
 * @desc   Connecter un Délégué
 * @route  POST /api/auth/delegue/login
 * @access Public
 */
const loginDelegue = (req, res) => {
  const { password } = req.body;

  // 1. Vérifier si le mot de passe a été fourni
  if (!password) {
    return res
      .status(400)
      .json({ message: 'Veuillez fournir un mot de passe.' });
  }

  // 2. Vérifier si le mot de passe est correct
  if (password === process.env.DELEGUE_PASSWORD) {
    // Mot de passe correct
    res.status(200).json({
      message: 'Authentification délégué réussie.',
      // Nous n'envoyons pas de token, le frontend gérera l'état
      // La règle des 3 tentatives sera gérée côté frontend
    });
  } else {
    // Mot de passe incorrect
    res.status(401).json({ message: 'Mot de passe incorrect.' });
  }
};

/**
 * @desc   Connecter le Super-Admin
 * @route  POST /api/auth/superadmin/login
 * @access Public
 */
const loginSuperAdmin = (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res
      .status(400)
      .json({ message: 'Veuillez fournir un mot de passe.' });
  }

  // Vérification du mot de passe Super-Admin
  if (password === process.env.ADMIN_SPACE_PASSWORD) {
    res.status(200).json({
      message: 'Authentification Super-Admin réussie.',
      // Ici, on pourrait ajouter un JWT (JSON Web Token) plus tard
      // pour sécuriser les routes /api/admin
    });
  } else {
    res.status(401).json({ message: 'Mot de passe incorrect.' });
  }
};

module.exports = {
  loginDelegue,
  loginSuperAdmin,
};
