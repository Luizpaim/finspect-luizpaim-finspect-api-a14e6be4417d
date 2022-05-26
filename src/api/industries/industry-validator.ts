import * as Joi from "joi";

export const industryModel = Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string()
});