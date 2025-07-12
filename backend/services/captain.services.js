const captainModel = require('../models/captain.model');

async function createCaptain({
  firstname,
  lastname,
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

async function findOne(query) {
  return await captainModel.findOne(query);
}

module.exports = { createCaptain, findOne };