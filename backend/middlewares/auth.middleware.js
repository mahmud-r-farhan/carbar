const jwt = require('jsonwebtoken');
const blacklistTokenModel = require('../models/blacklistToken.model');
const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');
const logger = require('../config/logger');

const baseAuth = async (req, res) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  if (!token) {
    throw new Error('No token provided');
  }

  const isBlacklisted = await blacklistTokenModel.findOne({ token });
  if (isBlacklisted) {
    throw new Error('Token blacklisted');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded;
};

const auth = async (req, res, next) => {
  try {
    const decoded = await baseAuth(req, res);
    let entity;

    if (decoded.role === 'user') {
      entity = await userModel.findById(decoded._id);
      req.user = entity;
    } else if (decoded.role === 'captain') {
      entity = await captainModel.findById(decoded._id);
      req.captain = entity;
    }

    if (!entity) {
      logger?.warn?.('Unauthorized: Entity not found');
      return res.status(401).json({ message: 'Unauthorized: Entity not found' });
    }

    req.entity = entity;
    req.role = decoded.role;
    next();
  } catch (err) {
    logger?.error?.(`Authentication error: ${err.message}`);
    res.status(401).json({ message: `Unauthorized: ${err.message}` });
  }
};

const authUser = async (req, res, next) => {
  try {
    const decoded = await baseAuth(req, res);
    if (decoded.role !== 'user') {
      return res.status(403).json({ message: 'Unauthorized: Invalid role' });
    }

    const user = await userModel.findById(decoded._id);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: `Unauthorized: ${err.message}` });
  }
};

const authCaptain = async (req, res, next) => {
  try {
    const decoded = await baseAuth(req, res);
    if (decoded.role !== 'captain') {
      return res.status(403).json({ message: 'Unauthorized: Invalid role' });
    }

    const captain = await captainModel.findById(decoded._id);
    if (!captain) {
      return res.status(401).json({ message: 'Unauthorized: Captain not found' });
    }

    req.captain = captain;
    next();
  } catch (err) {
    res.status(401).json({ message: `Unauthorized: ${err.message}` });
  }
};

module.exports = {
  auth,
  authUser,
  authCaptain,
};