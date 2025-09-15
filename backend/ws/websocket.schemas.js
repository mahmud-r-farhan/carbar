const Joi = require('joi');

const locationSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
});

const tripDataSchema = Joi.object({
  origin: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    address: Joi.string().required(),
  }).required(),
  destination: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    address: Joi.string().required(),
  }).required(),
  proposedAmount: Joi.number().positive().required(),
  vehicleType: Joi.string().valid('sedan', 'suv', 'truck').required(),
});

const tripResponseSchema = Joi.object({
  tripId: Joi.string().required(),
  action: Joi.string().valid('accept', 'reject').required(),
  amount: Joi.number().positive().optional(),
});

const tripStatusSchema = Joi.object({
  tripId: Joi.string().required(),
  status: Joi.string().valid('in_progress', 'completed', 'cancelled').required(),
});

const chatMessageSchema = Joi.object({
  tripId: Joi.string().required(),
  message: Joi.string().max(1000).required(),
});

const statusUpdateSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive').required(),
});

module.exports = {
  locationSchema,
  tripDataSchema,
  tripResponseSchema,
  tripStatusSchema,
  chatMessageSchema,
  statusUpdateSchema,
};