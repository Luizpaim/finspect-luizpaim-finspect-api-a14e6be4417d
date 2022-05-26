import * as Hapi from "hapi";
import * as Boom from "boom";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";
import { IRequest, IArrayRequest } from "../../interfaces/request";
import BalanceSheetUtils from "../../utils/balanceSheetUtils";

export default class BalanceSheetAccountLinkController {
  private database: IDatabase;
  private configs: IServerConfigurations;
  private balanceSheetUtils: BalanceSheetUtils;

  constructor(configs: IServerConfigurations, database: IDatabase) {
    this.configs = configs;
    this.database = database;
    this.balanceSheetUtils = new BalanceSheetUtils(database);
  }

  public async linkAccount(request: IArrayRequest, h: Hapi.ResponseToolkit) {
    const companyId = request.params.companyId;
    const accountantId = request.params.accountantId;
    try {
      const company = await this.database.companyModel.findOne({ _id: companyId, accountantId, deleted: false }).lean(true);
      if (!company) { return Boom.notFound(`Company ${companyId} does not exist`); }

      await Promise.all(request.payload.map(async acc => {
        return await this.database.balanceSheetUniqueAccountModel.findOneAndUpdate(
          { accountantId, companyId, code: acc.externalAccountCode },
          { $set: { internalAccountCode: acc.internalAccountCode }});
      }));

      if (await this.balanceSheetUtils.isStandardized(accountantId, companyId)) {
        // check if there are unspased balance sheets and then parse them
        const rawBalanceSheets = await this.database.rawBalanceSheetModel.find({ companyId, deleted: false });
        if (rawBalanceSheets) {
          await this.balanceSheetUtils.parseRawBalanceSheet(rawBalanceSheets);
        }
      }
      return h.response().code(200);
    } catch (error) {
      Boom.badImplementation(error);
    }
  }

  public async getUniqueAccounts(request: IRequest, h: Hapi.ResponseToolkit) {
    const companyId = request.params.companyId;
    const accountantId = request.params.accountantId;
    try {
      const company = await this.database.companyModel.findOne({ _id: companyId, accountantId, deleted: false }).lean(true);
      if (!company) { return Boom.notFound(`Company ${companyId} does not exist`); }

      const resp = await this.database.balanceSheetUniqueAccountModel.find({ accountantId, companyId });
      return h.response(resp).code(200);
    } catch (error) {
      Boom.badImplementation(error);
    }
  }

}
