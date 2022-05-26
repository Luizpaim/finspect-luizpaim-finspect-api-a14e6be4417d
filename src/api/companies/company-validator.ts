import * as Joi from "joi";
import * as CNPJ from "node-cnpj";

const customJoi = Joi.extend(joi => ({
  base: joi.string(),
  name: 'string',
  language: {
    cnpj: 'Need to be a valid CNPJ'
  },
  rules: [
    {
      name: 'cnpj',
      validate(params, value, state, options) {
        if (!CNPJ.validate(value)) {
          return this.createError('string.cnpj', { v: value }, state, options);
        }
        return value;
      }
    }
  ]
}));

export const createCompanyModel = Joi.array().items(
  Joi.object().keys({
    //User part
    email: Joi.string().email().required(),
    password: Joi.string().trim().regex(/^(?=.*[0-9])(?=.*[A-z]).{8,}$/).required(),
    //Company part
    accountantId: Joi.string().alphanum().length(24), //for admin users
    name: Joi.string().required(),
    //cnpj: Joi.document().cnpj(),
    cnpj: customJoi.string().cnpj().required(),
    contactName: Joi.string().required(),
    taxRegime: Joi.string().lowercase().required(),
    accountingSoftwareId: Joi.string().alphanum().length(24).required(),
    industryId: Joi.string().alphanum().length(24).required(),
    marketSegmentId: Joi.string().alphanum().length(24).required(),
    isActive: Joi.boolean().required()
  })
);

export const editCompanyModel = Joi.object().keys({
  //User part
  email: Joi.string().email().required(),
  password: Joi.string().trim().regex(/^(?=.*[0-9])(?=.*[A-z]).{8,}$/),
  // Context
  id: Joi.string(),
  accountantId: Joi.string().alphanum().length(24).required(),
  //Company part
  name: Joi.string().required(),
  //cnpj: Joi.document().cnpj(),
  cnpj: customJoi.string().cnpj().required(),
  contactName: Joi.string().required(),
  taxRegime: Joi.string().lowercase().required(),
  accountingSoftwareId: Joi.string().alphanum().length(24).required(),
  industryId: Joi.string().alphanum().length(24).required(),
  marketSegmentId: Joi.string().alphanum().length(24).required()
});