import * as Joi from "joi";

export const indicatorModel = Joi.object().keys({
  name: Joi.string().required(),
  description: Joi.string(),
  formula: Joi.string().required()
});