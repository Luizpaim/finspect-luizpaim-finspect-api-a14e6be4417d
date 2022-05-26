import * as Hapi from "hapi";
import * as Boom from "boom";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";
import { IRequest } from "../../interfaces/request";
import { SituationGroups } from './situation';

export default class SituationController {
  private database: IDatabase;
  private configs: IServerConfigurations;

  constructor(configs: IServerConfigurations, database: IDatabase) {
    this.configs = configs;
    this.database = database;
  }

  public async createSituation(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      const situation = await this.database.situationModel.create(request.payload);
      return h.response(situation).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async listSituations(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    try {
      let situations;
      if (id) {
        situations = await this.database.situationModel.findOne({ _id: id, deleted: false });
      } else {
        situations = await this.database.situationModel.find({ deleted: false });
        situations.sort((one, other) => {
          const oneGroup = SituationGroups.findIndex(group => group === one.group);
          const otherGroup = SituationGroups.findIndex(group => group === other.group);

          // order by order, inside of a given group
          if (oneGroup === otherGroup) {
            return one.order - other.order;
          }

          // order by group
          return oneGroup - otherGroup;
        });
      }
      return h.response(situations).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async editSituation(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      const situation = await this.database.situationModel.findOneAndUpdate({ _id: request.params.id, deleted: false }, request.payload, { new: true });
      if (situation) {
        return h.response(situation).code(200);
      } else {
        return Boom.notFound();
      }
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async deleteSituation(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      const situation = await this.database.situationModel.findOneAndUpdate({ _id: request.params.id, deleted: false }, { $set: { deleted: true } }, { new: true });
      if (situation) {
        return h.response(situation).code(200);
      } else {
        return Boom.notFound();
      }
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }
}