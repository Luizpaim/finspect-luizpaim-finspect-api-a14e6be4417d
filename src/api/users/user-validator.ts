import * as Joi from "joi";

export const createUserModel = Joi.object().keys({
    email: Joi.string().email().trim().required(),
    password: Joi.string().trim().regex(/^(?=.*[0-9])(?=.*[A-z]).{8,}$/).required(),
    name: Joi.string().required(),
    roles: Joi.array().items(Joi.string())
});

export const updateUserModel = Joi.object().keys({
    email: Joi.string().email().trim(),
    name: Joi.string(),
    password: Joi.string().trim().regex(/^(?=.*[0-9])(?=.*[A-z]).{8,}$/).required(),
});

export const loginUserModel = Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().trim().regex(/^(?=.*[0-9])(?=.*[A-z]).{8,}$/).required(),
});

export const changePasswordModel = Joi.object().keys({
    currentPassword: Joi.string().trim().regex(/^(?=.*[0-9])(?=.*[A-z]).{8,}$/).required(),
    newPassword: Joi.string().trim().regex(/^(?=.*[0-9])(?=.*[A-z]).{8,}$/).required()
});

export const jwtValidator = Joi.object({'authorization': Joi.string().required()}).unknown();