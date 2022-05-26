import * as Hapi from "hapi";
import * as Boom from "boom";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";
import { IRequest } from "../../interfaces/request";
import PaymentController from "../../utils/payment-controller";

export default class PlanController {
  private database: IDatabase;
  private configs: IServerConfigurations;
  private paymentController: PaymentController;

  constructor(configs: IServerConfigurations, database: IDatabase) {
    this.configs = configs;
    this.database = database;
    this.paymentController = new PaymentController();
  }

  private validatePlan(plan: any) {
    if ((plan['free'] || plan['negotiated']) && (plan['value'] || plan['days'])) { return false; }

    if (plan['free'] && plan['negotiated']) {
      return false;
    }

    return true;
  }

  public async createPlan(request: IRequest, h: Hapi.ResponseToolkit) {
    let plan, externalPlan;
    try {
      if (!this.validatePlan(request.payload)) {
        return Boom.badRequest('Invalid plan.');
      }

      if (request.payload['value'] > 0) {
        externalPlan = await this.paymentController.createPlan(request.payload);
        request.payload['pagarmeId'] = externalPlan.id;
      }

      if (request.payload['free']) {
        await this.database.planModel.updateMany({ free: true }, { $set: { free: false } });
      }

      plan = await this.database.planModel.create(request.payload);

      return h.response(plan).code(201);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async listPlans(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    try {
      let plans;
      if (id) {
        plans = await this.database.planModel.findOne({ _id: id, deleted: false });
      } else {
        const defaultPlan = await this.database.planModel.findOne({ free: true, deleted: false });
        plans = await this.database.planModel.find({ free: false, deleted: false }).sort({ value: 1, name: -1 });

        // sorting negotiated value plans last
        plans.sort(({ negotiated: first }, { negotiated: next }) => first ? 1 : (next ? -1 : 0));

        plans = defaultPlan ? [defaultPlan, ...plans] : [...plans];
      }

      return h.response(plans).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async editPlan(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      if (!this.validatePlan(request.payload)) {
        return Boom.badRequest('Invalid plan.');
      }

      const planId = request.params.id;

      if (request.payload['pagarmeId']) {
        await this.paymentController.updatePlan(request.payload);
      }

      if (request.payload['free']) {
        await this.database.planModel.updateMany({ _id: { $ne: planId }, free: true }, { $set: { free: false } });
      }

      const plan = await this.database.planModel.findOneAndUpdate({ _id: planId, deleted: false }, request.payload, { new: true });
      if (plan) {
        return h.response(plan).code(200);
      } else {
        return Boom.notFound();
      }
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async deletePlan(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      const plan = await this.database.planModel.findOneAndUpdate({ _id: request.params.id, deleted: false }, { $set: { deleted: true } }, { new: true });
      if (plan) {
        return h.response(plan).code(200);
      } else {
        return Boom.notFound();
      }
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }
}
