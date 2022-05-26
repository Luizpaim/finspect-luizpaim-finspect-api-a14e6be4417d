import * as Hapi from "hapi";
import * as Boom from "boom";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";
import { IRequest } from "../../interfaces/request";

export default class MarketSegmentController {
  private database: IDatabase;
  private configs: IServerConfigurations;

  constructor(configs: IServerConfigurations, database: IDatabase) {
    this.configs = configs;
    this.database = database;
  }

  public async createMarketSegment(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      const marketSegment = await this.database.marketSegmentModel.create(request.payload);
      return h.response(marketSegment).code(201);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async listMarketSegments(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    try {
      let marketSegments;
      if (id) {
        marketSegments = await this.database.marketSegmentModel.findOne({ _id: id, deleted: false });
      } else {
        marketSegments = await this.database.marketSegmentModel.find({ deleted: false });
      }
      return h.response(marketSegments).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async editMarketSegment(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      const marketSegment = await this.database.marketSegmentModel.findOneAndUpdate({ _id: request.params.id, deleted: false }, request.payload, { new: true });
      if (marketSegment) {
        return h.response(marketSegment).code(200);
      } else {
        return Boom.notFound();
      }
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async deleteMarketSegment(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      const marketSegment = await this.database.marketSegmentModel.findOneAndUpdate({ _id: request.params.id, deleted: false }, { $set: { deleted: true } }, { new: true });
      if (marketSegment) {
        return h.response(marketSegment).code(200);
      } else {
        return Boom.notFound();
      }
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }
}