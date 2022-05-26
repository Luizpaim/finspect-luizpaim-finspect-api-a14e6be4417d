import * as Joi from "joi";

export const createAccountantModel = Joi.object().keys({
  //User part
  email: Joi.string().email(),
  password: Joi.string().trim().regex(/^(?=.*[0-9])(?=.*[A-z]).{8,}$/).required(),
  //Company part
  name: Joi.string().required(),
  cnpj: Joi.string().length(14).alphanum().required()
});

export const editAccountantModel = Joi.object().keys({
  //User part
  email: Joi.string().email(),
  password: Joi.string().trim().regex(/^(?=.*[0-9])(?=.*[A-z]).{8,}$/),
  //Company part
  id: Joi.string(),
  name: Joi.string().required(),
  cnpj: Joi.string().length(14).alphanum().required(),
  logo: Joi.string(),
  isActive: Joi.boolean(),
  useDefaultLogo: Joi.boolean(),
});

export const addCreditCardModel = Joi.object().keys({
  number: Joi.string().creditCard().required(),
  expirationDate: Joi.string().length(4).required(),
  cvv: Joi.string().min(3).max(4).required(),
  holderName: Joi.string().uppercase().required(),
  address: Joi.object().keys({
    street: Joi.string().required(),
    street_number: Joi.string().required(),
    neighborhood: Joi.string().required(),
    zipcode: Joi.string().required()
  }).required(),
});

export const subscribeToPlanModel = Joi.object().keys({
  paymentMethod: Joi.string().valid('boleto', 'credit_card').required(),
  phone: Joi.object().keys({
    ddd: Joi.string().length(2).required(),
    number: Joi.string().min(8).max(9).required()
  }),
  address: Joi.object().keys({
    street: Joi.string().required(),
    street_number: Joi.string().required(),
    neighborhood: Joi.string().required(),
    zipcode: Joi.string().required()
  }),
  // Card details
  card: Joi.object().keys({
    number: Joi.string().creditCard().required(),
    expirationDate: Joi.string().length(4).required(),
    cvv: Joi.string().min(3).max(4).required(),
    holderName: Joi.string().uppercase().required()
  })
});
