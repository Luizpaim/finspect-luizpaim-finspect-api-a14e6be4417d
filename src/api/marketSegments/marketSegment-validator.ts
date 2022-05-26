import * as Joi from "joi";

export const marketSegmentModel = Joi.object().keys({
    industryId: Joi.string().alphanum().length(24).required(),
    name: Joi.string().required(),
    description: Joi.string()
});