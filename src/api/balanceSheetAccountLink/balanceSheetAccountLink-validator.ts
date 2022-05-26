import * as Joi from "joi";

export const linkAccount = Joi.array().items(
  Joi.object().keys({
    internalAccountCode: Joi.string().required(),
    externalAccountCode: Joi.string().required()
  })
);