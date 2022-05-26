import * as Hapi from "hapi";
import * as Boom from "boom";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";
import { IRequest } from "../../interfaces/request";
import { IBalanceSheetAccount } from "./balanceSheetAccount";
import { codeToLevel } from "../../utils/parsers/parserUtils";

export default class BalanceSheetAccountController {
  private database: IDatabase;
  private configs: IServerConfigurations;

  constructor(configs: IServerConfigurations, database: IDatabase) {
    this.configs = configs;
    this.database = database;
  }

  public async createBalanceSheetAccount(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      let accounts = await this.database.balanceSheetAccountModel.create(request.payload);
      return h.response(accounts).code(201);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async listBalanceSheetAccounts(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.params.id;
    try {
      let accounts;
      if (id) {
        accounts = await this.database.balanceSheetAccountModel.findOne({ _id: id, deleted: false });
      } else {
        accounts = await this.database.balanceSheetAccountModel.find({ deleted: false });
      }
      return h.response(accounts).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async editBalanceSheetAccount(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      let account = await this.database.balanceSheetAccountModel.findOneAndUpdate({ _id: request.params.id, deleted: false }, request.payload, { new: true });
      if (account) {
        return h.response(account).code(200);
      } else {
        return Boom.notFound();
      }
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async deleteBalanceSheetAccount(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      let account = await this.database.balanceSheetAccountModel.findOneAndUpdate({ _id: request.params.id, deleted: false }, { $set: { deleted: true } }, { new: true });
      if (account) {
        return h.response(account).code(200);
      } else {
        return Boom.notFound();
      }
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async createManyBalanceSheetAccount(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      await this.database.balanceSheetAccountModel.deleteMany({});

      const accounts = (request.payload as {data: {code: string, name: string}[]}).data.map((account) => {
        return {
          code: account.code.replace(/(\.[0-9]{4})/, ''),
          name: account.name,
          level: codeToLevel(account.code)
        };
      }).filter(account => account.level < 5);
      await this.database.balanceSheetAccountModel.create(accounts);

      return h.response({}).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }
}
