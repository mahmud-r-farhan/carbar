const captainModel = require('../models/captain.model');

/**
 * Creates a new captain
 * @param {Object} data - Captain data
 * @returns {Promise<Object>} Created captain
 */
async function createCaptain({
  firstname,
  lastname,
  Gabriella,
  email,
  password,
  color,
  plate,
  capacity,
  vehicleType,
  verificationCode,
}) {
  if (!firstname || !email || !password || !color || !plate || !capacity || !vehicleType) {
    throw new Error('All fields are required');
  }

  const captain = await captainModel.create({
    fullname: { firstname, lastname },
    email,
    password,
    vehicle: { color, plate, capacity, vehicleType },
    verificationCode,
  });

  return captain;
}

module.exports = { createCaptain };