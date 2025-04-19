const Joi = require('joi');

// Validation schema for Facebook account registration
const registerFacebookSchema = {
  body: Joi.object().keys({
    profileId: Joi.number().required().messages({
      'any.required': 'Dolphin profile ID is required',
      'number.base': 'Dolphin profile ID must be a number'
    })
  })
};

module.exports = {
  registerFacebookSchema
}; 