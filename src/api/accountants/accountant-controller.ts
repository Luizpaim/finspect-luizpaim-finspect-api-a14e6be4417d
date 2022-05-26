import * as Hapi from "hapi";
import * as Boom from "boom";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";
import { IRequest } from "../../interfaces/request";
import UserController from "../users/user-controller";
import PaymentController from "../../utils/payment-controller";

export default class AccountantController {
  private database: IDatabase;
  private configs: IServerConfigurations;
  private userController: UserController;
  private paymentController: PaymentController;

  constructor(configs: IServerConfigurations, database: IDatabase) {
    this.configs = configs;
    this.database = database;
    this.userController = new UserController(configs, database);
    this.paymentController = new PaymentController();
  }

  public async createAccoutant(request: IRequest, h: Hapi.ResponseToolkit) {
    const accountant = request.payload;
    let user, newAccountant;
    try {
      user = await this.database.userModel.findOne({ email: accountant['email'] });
      if (user) {
        return Boom.badData(`User ${user.email} already exists`);
      }

      newAccountant = await this.database.accountantModel.findOne({ cnpj: accountant['cnpj'], deleted: false });
      if (newAccountant) {
        return Boom.badData(`CNPJ ${newAccountant.cnpj} already exists`);
      }

      accountant['planId'] = (await this.database.planModel.findOne({ value: 0 }).lean(true))._id;
      newAccountant = await this.database.accountantModel.create(accountant);

      user = {
        email: accountant['email'],
        password: accountant['password'],
        name: '',
        roles: ['accountant', `accountant-${newAccountant._id}`],
        relatedTo: 'accountant',
        relatedToId: newAccountant._id
      };

      user = await this.database.userModel.create(user);
    } catch (error) {
      if (newAccountant) {
        newAccountant.remove();
      }

      if (user) {
        user.remove();
      }

      return Boom.badImplementation(error);
    }

    return h.response(newAccountant).code(201);
  }

  public async listAccountants(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    try {
      let accountants;
      if (id) {
        accountants = await this.database.accountantModel.findOne({ _id: id, deleted: false }).lean(true);
        if (!accountants) { return Boom.notFound(`Accountant ${id} does not exist`); }
        const user = await this.userController.getUserByRelatedToId(accountants._id);
        accountants['email'] = user.email;
      } else {
        accountants = await this.database.accountantModel.find().lean(true);
        accountants = await Promise.all(accountants.map(async accountant => {
          try {
            const user = await this.userController.getUserByRelatedToId(accountant._id);
            accountant['email'] = user.email;
          } catch (error) {
            return { error: true };
          }
          return accountant;
        }));
      }
      return h.response(accountants).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async getAccountantBasicInfo(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    try {
      const accountant = await this.database.accountantModel.findOne({ _id: id, deleted: false }, 'name useDefaultLogo logo').lean(true);
      return h.response(accountant).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }

  }

  public async editAccountant(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    try {
      let accountant = await this.database.accountantModel.findOne({ cnpj: request.payload['cnpj'], deleted: false });
      if (accountant && `${accountant._id}` !== id) { return Boom.badRequest(`CNPJ ${accountant.cnpj} ${id} ${accountant._id} is already registered`); }

      accountant = await this.database.accountantModel.findOneAndUpdate({ _id: id, deleted: false }, request.payload, { new: true });
      if (!accountant) { return Boom.notFound(`Accountant ${id} does not exist`); }

      this.userController.updateUserByRelatedToId(id, { email: request.payload['email'], password: request.payload['password'] });

      return h.response(accountant).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async deleteAccountant(request: IRequest, h: Hapi.ResponseToolkit) {
    return h.response().code(200);
  }

  public async addCreditCard(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    try {
      const accountant = await this.database.accountantModel.findOne({ _id: id, deleted: false });
      if (!accountant) { return Boom.notFound(`Accountant ${id} does not exist`); }

      const card = await this.paymentController.saveCard(request.payload);
      let newCard = {
        accountantId: id,
        cardId: card.id,
        cardLastDigits: card.last_digits,
        cardBrand: card.brand,
        cardExpirationDate: card.expiration_date,
        address: request.payload['address']
      };

      const alreadyCreatedCard = await this.database.creditCardModel.findOne({ cardId: card.id });

      if (alreadyCreatedCard) {
        newCard = alreadyCreatedCard;
      } else {
        newCard = await this.database.creditCardModel.create(newCard);
      }
      return h.response(newCard).code(200);
    } catch (error) {
      if (error.name === 'ApiError') {
        return Boom.serverUnavailable(error);
      }
      return Boom.badImplementation(error);
    }
  }

  public async listCreditCards(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    try {
      const accountant = await this.database.accountantModel.findOne({ _id: id, deleted: false });
      if (!accountant) { return Boom.notFound(`Accountant ${id} does not exist`); }

      const cards = await this.database.creditCardModel.find({ accountantId: id, deleted: false });
      return h.response(cards).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async deleteCreditCard(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    const cardId = request.params.cardId;
    try {
      const accountant = await this.database.accountantModel.findOne({ _id: id, deleted: false });
      if (!accountant) { return Boom.notFound(`Accountant ${id} does not exist`); }
      if (accountant.paymentMethodId !== cardId) {
        await this.database.creditCardModel.findByIdAndUpdate(cardId, { deleted: true });
      } else {
        return Boom.badRequest('Cannot delete current payment method');
      }
      return h.response().code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async changePaymentMethod(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    const paymentMethodId = request.params.paymentId;
    try {
      const accountant = await this.database.accountantModel.findOne({ _id: id, deleted: false });
      if (!accountant) { return Boom.notFound(`Accountant ${id} does not exist`); }
      if (paymentMethodId) {
        const card = await this.database.creditCardModel.findOne({ _id: paymentMethodId, deleted: false });
        if (card) {
          await this.paymentController.changePaymentMethod(accountant.subscriptionId, card.cardId);
          accountant.paymentMethodId = paymentMethodId;
        } else {
          return Boom.notFound(`Card ${paymentMethodId} does not exist`);
        }
      } else {
        await this.paymentController.changePaymentMethod(accountant.subscriptionId);
        accountant.paymentMethodId = null;
      }
      accountant.save();
      return h.response(accountant).code(200);
    } catch (error) {
      if (error.name === 'ApiError') {
        return Boom.serverUnavailable(error);
      }
      return Boom.badImplementation(error);
    }
  }

  public async subscribeToPremium(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    const planId = request.params.planId;

    try {
      const accountant = await this.database.accountantModel.findOne({ _id: id, deleted: false });
      if (!accountant) { return Boom.notFound(`Accountant ${id} does not exist`); }
      if (accountant.planId === planId) { return Boom.forbidden('You are already subscribed to this plan!'); }

      const user = await this.userController.getUserByRelatedToId(id);
      const info = {
        email: user.email,
        address: request.payload['address'],
        name: accountant.name,
        document_number: accountant.cnpj,
        phone: request.payload['phone']
      };

      const plan = await this.database.planModel.findById(planId);
      if (plan.free || plan.negotiated || !plan.pagarmeId || !plan.value) {
        return Boom.forbidden('Invalid plan to subscribe to!');
      }

      let subscription;
      if (request.payload['paymentMethod'] === 'credit_card') {
        const card = await this.paymentController.saveCard(request.payload['card']);
        let newCard = {
          accountantId: id,
          cardId: card.id,
          cardLastDigits: card.last_digits,
          cardBrand: card.brand,
          cardExpirationDate: card.expiration_date,
          address: info.address
        };
        const alreadyCreatedCard = await this.database.creditCardModel.findOne({ cardId: card.id });
        if (alreadyCreatedCard) {
          newCard = alreadyCreatedCard;
        } else {
          newCard = await this.database.creditCardModel.create(newCard);
        }
        subscription = await this.paymentController.subscribe(plan.pagarmeId, info, card.id);
        accountant.paymentMethodId = newCard['_id'];
      } else {
        subscription = await this.paymentController.subscribe(plan.pagarmeId, info);
      }

      accountant.address = info.address;
      accountant.phone = info.phone;
      accountant.subscriptionId = subscription.id;
      accountant.planId = planId;
      accountant.save();

      return h.response(subscription).code(200);
    } catch (error) {
      if (error.response.errors[0].message === 'Não foi possível realizar uma transação nesse cartão de crédito.') {
        return Boom.badRequest('UnsafeCreditCard');
      }
      if (error.name === 'ApiError') {
        return Boom.serverUnavailable(error);
      }
      return Boom.badImplementation(error);
    }
  }

  public async cancelSubscription(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    try {
      const accountant = await this.database.accountantModel.findOne({ _id: id, deleted: false });
      if (!accountant) { return Boom.notFound(`Accountant ${id} does not exist`); }

      const subscription = await this.paymentController.unsubscribe(accountant.subscriptionId);
      const plan = await this.database.planModel.findOne({ free: true });
      accountant.planId = plan._id;
      accountant.subscriptionId = null;
      accountant.paymentMethodId = null;
      accountant.save();

      const count = await this.database.companyModel.count({ accountantId: id, deleted: false, active: true });
      if (count && count > plan.maxCompanies) {
        await this.database.companyModel.updateMany({ accountantId: id, deleted: false }, { $set: { isActive: false } });
      }

      return h.response(subscription).code(200);
    } catch (error) {
      if (error.name === 'ApiError') {
        return Boom.serverUnavailable(error);
      }
      return Boom.badImplementation(error);
    }
  }

  public async getSubscriptionInfo(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    try {
      const accountant = await this.database.accountantModel.findOne({ _id: id, deleted: false });
      if (!accountant) { return Boom.notFound(`Accountant ${id} does not exist`); }

      if (accountant.subscriptionId) {
        const subscription = await this.paymentController.getSubscriptionInfo(accountant.subscriptionId);
        return h.response(subscription).code(200);
      } else {
        return Boom.notFound(`Accountant ${id} does not have an active subscription`);
      }
    } catch (error) {
      if (error.name === 'ApiError') {
        return Boom.serverUnavailable(error);
      }
      return Boom.badImplementation(error);
    }
  }
}
