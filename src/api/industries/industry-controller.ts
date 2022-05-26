import * as Hapi from "hapi";
import * as Boom from "boom";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";
import { IRequest } from "../../interfaces/request";

export default class IndustryController {
  private database: IDatabase;
  private configs: IServerConfigurations;

  constructor(configs: IServerConfigurations, database: IDatabase) {
    this.configs = configs;
    this.database = database;
  }

  public async createIndustry(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      const industry = await this.database.industryModel.create(request.payload);
      return h.response(industry).code(201);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async listIndustries(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    try {
      let industries;
      if (id) {
        industries = await this.database.industryModel.findOne({_id: id, deleted: false });
      } else {
        industries = await this.database.industryModel.find({ deleted: false });
      }
      return h.response(industries).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async editIndustry(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      const industry = await this.database.industryModel.findOneAndUpdate({ _id: request.params.id, deleted: false }, request.payload, { new: true });
      if (industry) {
        return h.response(industry).code(200);
      } else {
        return Boom.notFound();
      }
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async deleteIndustry(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      const industry = await this.database.industryModel.findOneAndUpdate({ _id: request.params.id, deleted: false }, { $set: { deleted: true } }, { new: true });
      if (industry) {
        return h.response(industry).code(200);
      } else {
        return Boom.notFound();
      }
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }
}