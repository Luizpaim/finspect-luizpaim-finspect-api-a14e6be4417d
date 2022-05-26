import * as Joi from "joi";

export const planModel = Joi.object().keys({
    name: Joi.string().required(),
    value: Joi.number().positive().allow(0),
    maxCompanies: Joi.number().positive().allow(0),
    free: Joi.boolean(),
    negotiated: Joi.boolean(),
    days: Joi.number().valid(30, 365),
    items: Joi.array().items(Joi.string()),
    pagarmeId: Joi.number(),
});