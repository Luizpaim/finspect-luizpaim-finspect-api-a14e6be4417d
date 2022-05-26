import * as Hapi from "hapi";
import * as Boom from "boom";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";
import { IRequest } from "../../interfaces/request";

export default class AccountingSoftwareController {
  private database: IDatabase;
  private configs: IServerConfigurations;

  constructor(configs: IServerConfigurations, database: IDatabase) {
    this.configs = configs;
    this.database = database;
  }

  public async createAccountingSoftware(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      const accountingSoftware = await this.database.accountingSoftwareModel.create(request.payload);
      return h.response(accountingSoftware).code(201);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async listAccountingSoftwares(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    try {
      let accountingSoftwares;
      if (id) {
        accountingSoftwares = await this.database.accountingSoftwareModel.findOne({_id: id, deleted: false });
      } else {
        accountingSoftwares = await this.database.accountingSoftwareModel.find({ deleted: false });
      }
      return h.response(accountingSoftwares).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async editAccountingSoftware(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      const accountingSoftware = await this.database.accountingSoftwareModel.findOneAndUpdate({ _id: request.params.id, deleted: false }, request.payload, { new: true });
      if (accountingSoftware) {
        return h.response(accountingSoftware).code(200);
      } else {
        return Boom.notFound();
      }
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async deleteAccountingSoftware(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      const accountingSoftware = await this.database.accountingSoftwareModel.findOneAndUpdate({ _id: request.params.id, deleted: false }, { $set: { deleted: true } }, { new: true });
      if (accountingSoftware) {
        return h.response(accountingSoftware).code(200);
      } else {
        return Boom.notFound();
      }
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }
}