const userModel = require('../models/user.model');

async function createUser({ firstname, lastname, email, password, verificationCode }) {
  if (!firstname || !email || !password) {
    throw new Error('All fields are required');
  }

  const user = await userModel.create({
    fullname: { firstname, lastname },
    email,
    password,
    verificationCode,
  });

  return user;
}

async function findOne(query) {
  return await userModel.findOne(query);
}

module.exports = { createUser, findOne };