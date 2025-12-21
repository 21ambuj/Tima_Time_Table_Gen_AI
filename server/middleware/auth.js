const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const verified = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_123');

    req.user = verified;

    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid Token" });
  }
};

module.exports = auth;