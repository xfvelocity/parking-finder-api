const { EmailValidation } = require("../models/index.js");

const { MailtrapClient } = require("mailtrap");
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

const getUserFromToken = (req, res, next) => {
  const token = req.header("Authorization");

  try {
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }

    next();
  } catch (error) {
    return res.status(403).json({ message: error });
  }
};

const sendEmailVerification = async (user) => {
  const client = new MailtrapClient({
    endpoint: process.env.MAILTRAP_ENDPOINT,
    token: process.env.MAILTRAP_TOKEN,
  });

  const emailVerificationCode = Math.floor(10000 + Math.random() * 90000);

  await client.send({
    from: {
      name: "Parking Finder",
      email: process.env.MAILTRAP_FROM_EMAIL,
    },
    to: [
      {
        email: user.email,
      },
    ],
    template_uuid: process.env.MAILTRAP_TEMPLATE,
    template_variables: {
      user_email: user.email,
      code: emailVerificationCode,
    },
  });

  const expiryDate = new Date();

  expiryDate.setMinutes(expiryDate.getMinutes() + 15);

  await EmailValidation.create({
    uuid: user.uuid,
    code: emailVerificationCode,
    expiresAt: expiryDate,
  });
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

const roundDecimal = (number, decimals) => {
  const factor = Math.pow(10, decimals);

  return Math.floor(number * factor) / factor;
};

// ** Distance **
const checkDistance = (lat1, lon1, lat2, lon2, range) => {
  const toRad = (angle) => (angle * Math.PI) / 180;

  const R = 6371000; // Radius of the Earth in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c <= range;
};

const calculateHoursBetween = (time1, time2) => {
  // Parse the time strings into hours and minutes
  const startHour = parseInt(time1.slice(0, 2), 10);
  const endHour = parseInt(time2.slice(0, 2), 10);

  const startTime = new Date(2024, 0, 1, startHour, 0);
  const endTime = new Date(2024, 0, 1, endHour, 0);

  if (endTime <= startTime) {
    endTime.setDate(endTime.getDate() + 1);
  }

  const differenceInHours = (endTime - startTime) / (1000 * 60 * 60);

  return differenceInHours;
};

module.exports = {
  checkDistance,
  paginatedList,
  hashPassword,
  sendEmailVerification,
  comparePassword,
  authenticateToken,
  getUserFromToken,
  roundDecimal,
  calculateHoursBetween,
};
