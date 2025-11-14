// controllers/contactController.js

/**
 * @desc   Récupérer les liens de contact
 * @route  GET /api/contact
 * @access Public
 */
const getContactLinks = (req, res) => {
  // On lit directement les variables d'environnement
  const whatsapp = process.env.WHATSAPP_LINK;
  const facebook = process.env.FACEBOOK_LINK;
  const adminNumber = process.env.ADMIN_NUMBER;

  if (!whatsapp || !facebook || !adminNumber) {
    console.warn('Variables de contact non définies dans .env');
    return res.status(500).json({
      // CORRECTION ICI: Guillemets simples remplacés par des backticks
      message: `Liens de contact non configurés par l'administrateur.`, 
    });
  }

  res.status(200).json({
    whatsappLink: whatsapp,
    facebookLink: facebook,
    adminNumber: adminNumber,
  });
};

module.exports = {
  getContactLinks,
};