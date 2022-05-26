import * as Hapi from "hapi";
import * as Boom from "boom";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";
import { IRequest } from "../../interfaces/request";
import PaymentController from "../../utils/payment-controller";
import * as Email from '../../utils/email-sender';
import * as qs from 'qs';
import * as moment from 'moment';

export default class TransactionController {
  private database: IDatabase;
  private configs: IServerConfigurations;
  private paymentController: PaymentController;

  constructor(configs: IServerConfigurations, database: IDatabase) {
    this.configs = configs;
    this.database = database;
    this.paymentController = new PaymentController();
  }

  public async onSubscriptionStatusChange(request: IRequest, h: Hapi.ResponseToolkit) {
    const data = qs.parse(request.payload.toString());

    if (!await this.paymentController.validatePostback(request)) {
      return Boom.unauthorized('IMPOSTOR!');
    }

    if (data.object !== 'subscription' || data.event !== 'subscription_status_changed' || data.current_status === 'canceled') {
      return h.response().code(200);
    }

    const accountant = await this.database.accountantModel.findOne({ subscriptionId: data.id });
    if (data.current_status === 'payment_pending' || data.current_status === 'unpaid') {
      Email.sendUnpaidEmail(accountant);
    }

    if (data.current_status === 'paid') {
      const { plan: { id: paidPlanId } } = await this.paymentController.getSubscriptionInfo(data.id);
      const paidPlan = await this.database.planModel.findOne({ pagarmeId: paidPlanId });

      if (paidPlan && accountant.planId !== paidPlan._id) {
        accountant.planId = paidPlan._id;

        await this.database.companyModel.updateMany({ accountantId: accountant._id, deleted: false }, { $set: { isActive: true } });
      }
    }

    return h.response().code(200);
  }

  public async listTransactions(request: IRequest, h: Hapi.ResponseToolkit) {
    const transactions = await this.paymentController.listTransactions();

    const resp = transactions.reduce((filtered: any[], t) => {
      if (!t.boleto_expiration_date || moment(t.boleto_expiration_date).isSameOrAfter(moment())) {
        filtered.push({
          id: t.id,
          amount: t.amount,
          status: t.status,
          accountant: t.customer.name,
          email: t.customer.email,
          payment_method: t.payment_method,
          date: t.date_updated,
          info: t.boleto_barcode || `${t.card_brand.toUpperCase()} **** **** **** ${t.card_last_digits}`
        });
      }
      return filtered;
    }, []);

    return h.response(resp).code(200);
  }
}