import * as Joi from "joi";

export const accountingSoftwareModel = Joi.object().keys({
    name: Joi.string().required()
});