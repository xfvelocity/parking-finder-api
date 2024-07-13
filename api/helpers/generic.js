const bcrupt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ** Auth **
const hashPassword = (password) => {
  return new Promise((resolve, reject) => {
    bcrupt.genSalt(12, (err, salt) => {
      if (err) {
        reject(err);
      }

      bcrupt.hash(password, salt, (err, hash) => {
        if (err) {
          reject(err);
        }

        resolve(hash);
      });
    });
  });
};

const comparePassword = (password, hashedPassword) => {
  return bcrupt.compare(password, hashedPassword);
};

const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "Access denied. Token missing." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Access denied. Invalid token." });
  }
};

// ** Paginated list **
const paginatedList = async (req, model, query, sortBy = {}) => {
  const page = parseInt(req.query.page || "") || 1;
  const perPage = parseInt(req.query.perPage || "") || 10;

  const pageItems = await model
    .find(query)
    .sort(sortBy)
    .skip((page - 1) * perPage)
    .limit(perPage)
    .lean();
  const total = await model.countDocuments(query);

  return {
    data: pageItems,
    meta: {
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
      total,
    },
  };
};

module.exports = {
  paginatedList,
  hashPassword,
  comparePassword,
  authenticateToken,
};
