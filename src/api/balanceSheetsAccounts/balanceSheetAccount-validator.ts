import * as Joi from "joi";

export const balanceSheetAccountModel = Joi.object().keys({
  code: Joi.string().required(),
  level: Joi.number(),
  name: Joi.string().required(),
  description: Joi.string()
});

export const manyBalanceSheetAccountModel = Joi.object().keys({
  data: Joi.array().items(
    Joi.object().keys({
      code: Joi.string().required(),
      name: Joi.string().required()
    })
  )
});
