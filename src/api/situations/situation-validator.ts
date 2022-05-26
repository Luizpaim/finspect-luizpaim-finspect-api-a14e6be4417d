import * as Joi from "joi";
import { SituationGroups } from "./situation";

export const situationModel = Joi.object().keys({
  name: Joi.string().required(),
  message: Joi.string(),
  frequency: Joi.string().valid(['monthly', 'quarterly', 'yearly']).required(),
  formulas: Joi.array().items(Joi.object().keys({
    expression: Joi.string().required(),
    operator: Joi.string().required(),
    value: Joi.string().required(),
  })).required(),
  active: Joi.boolean().default(true),
  group: Joi.string().valid(SituationGroups).required(),
  order: Joi.number(),
});