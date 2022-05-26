import * as Hapi from "hapi";
import * as Boom from "boom";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";
import { IRequest } from "../../interfaces/request";

export default class IndicatorController {
  private database: IDatabase;
  private configs: IServerConfigurations;

  constructor(configs: IServerConfigurations, database: IDatabase) {
    this.configs = configs;
    this.database = database;
  }

  public async createIndicator(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      const indicator = await this.database.indicatorModel.create(request.payload);
      return h.response(indicator).code(201);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async listIndicators(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    try {
      let indicators;
      if (id) {
        indicators = await this.database.indicatorModel.findOne({ _id: id, deleted: false });
      } else {
        indicators = await this.database.indicatorModel.find({ deleted: false });
      }
      return h.response(indicators).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async editIndicator(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      const indicator = await this.database.indicatorModel.findOneAndUpdate({ _id: request.params.id, deleted: false }, request.payload, { new: true });
      if (indicator) {
        return h.response(indicator).code(200);
      } else {
        return Boom.notFound();
      }
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async deleteIndicator(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      const indicator = await this.database.indicatorModel.findOneAndUpdate({ _id: request.params.id, deleted: false }, { $set: { deleted: true } }, { new: true });
      if (indicator) {
        return h.response(indicator).code(200);
      } else {
        return Boom.notFound();
      }
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }
}