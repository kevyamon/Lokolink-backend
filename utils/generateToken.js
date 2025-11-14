 // utils/generateToken.js

const jwt = require('jsonwebtoken');

// Génère un token JWT signé avec notre secret
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role }, // Les "données" que nous stockons dans le token
    process.env.JWT_SECRET, // Notre "sceau" secret
    {
      expiresIn: '30d', // Le token expire dans 30 jours
    }
  );
};

module.exports = generateToken;
