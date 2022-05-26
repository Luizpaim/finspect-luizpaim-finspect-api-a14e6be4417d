import * as Hapi from "hapi";
import * as Boom from "boom";
import { ExcelWriter } from 'node-excel-stream';
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";
import { IRequest } from "../../interfaces/request";
import { readStream } from "../../utils/helper";
import FileController from "../files/file-controller";
import BalanceSheetUtils from "../../utils/balanceSheetUtils";
import { IBalanceSheetUniqueAccount } from "../balanceSheetAccountLink/balanceSheetUniqueAccount";
import * as moment from "moment";
import { flatten, keyBy, last, map, orderBy } from "lodash";

const FILE_SIZE_LIMIT = 1024 * 1024;

export default class BalanceSheetController {
  private database: IDatabase;
  private configs: IServerConfigurations;
  private fileController: FileController;
  private balanceSheetUtils: BalanceSheetUtils;

  constructor(configs: IServerConfigurations, database: IDatabase) {
    this.configs = configs;
    this.database = database;
    this.fileController = new FileController(configs, database);
    this.balanceSheetUtils = new BalanceSheetUtils(database);
  }

  public async importBalanceSheets(request: IRequest, h: Hapi.ResponseToolkit) {
    const companyId = request.params.companyId;
    const accountantId = request.params.accountantId;

    const company = await this.database.companyModel.findOne({ _id: companyId, accountantId });
    if (!company) {
      return Boom.notFound();
    }

    const accountingSoftware = await this.database.accountingSoftwareModel.findOne({ _id: company.accountingSoftwareId });
    if (!accountingSoftware) {
      return Boom.notFound();
    }

    let files = [];

    // If we are importing a single balance sheet
    if (request.payload['month'] && request.payload['year']) {
      const stream = request.payload['file'];
      const rawFile = await readStream(stream);
      const month = moment(request.payload['month'], 'MM').format('MM');
      const year = request.payload['year'];
      const fileExtension = stream['hapi'].filename.split('.').pop();
      const filename = `${month}-${year}.${fileExtension}`;

      files.push({ month, year, rawFile, filename });
    // If we are importing multiple balance sheets
    } else {
      files = await Promise.all(
        (<any>Object).values(request.payload).map(async stream => {
          let [month, year] = stream['hapi'].filename.split('.')[0].split('-');
          month = moment(month, 'MM').format('MM');
          const rawFile = await readStream(stream);
          const { filename } = stream['hapi'];

          return { month, year, rawFile, filename };
        })
      );
    }

    const bigFile = files.find(file => file.byteLength > FILE_SIZE_LIMIT);
    if (bigFile) {
      return Boom.entityTooLarge(`${bigFile.filename} é maior que o permitido.`);
    }

    const orderedFiles = orderBy(files, ['year', 'month'], ['asc', 'asc']);

    const parsingPromises = orderedFiles.map(async file => {
      let accounts;
      try {
        accounts = await this.balanceSheetUtils.parseBalanceSheetFile(file.rawFile, accountingSoftware);
      } catch (error) {
        throw Boom.badRequest(error.message);
      }

      return { ...file, accounts };
    });

    const parsedRawBalanceSheets = await Promise.all(parsingPromises);

    const allAccounts = flatten(parsedRawBalanceSheets.map(balanceSheet => balanceSheet.accounts));
    const uniqAccounts = map(keyBy(allAccounts, 'code'));

    // Update company unique accounts and insert the new ones
    const uniqueAccountModelUpdates: Promise<IBalanceSheetUniqueAccount>[] = uniqAccounts.map(
      account => this
        .database
        .balanceSheetUniqueAccountModel
        .findOneAndUpdate(
          { accountantId, companyId, code: account.code },
          {
            accountantId,
            companyId,
            code: account.code,
            name: account.name,
            level: account.level,
          },
          { upsert: true, setDefaultsOnInsert: true }
        )
        .exec()
    );
    await Promise.all(uniqueAccountModelUpdates);

    // Auto linking
    await this.balanceSheetUtils.autoLinking(accountantId, companyId, uniqAccounts);

    // Check if a new account was inserted, thus needing parameterization
    const isStandardized = await this.balanceSheetUtils.isStandardized(accountantId, companyId);

    // Check if this is the newest balance sheet of the company
    const lastBalanceSheet = last(parsedRawBalanceSheets);
    const lastBalanceSheetKey = `${lastBalanceSheet.year}-${lastBalanceSheet.month}`;
    if (lastBalanceSheetKey > company.lastBalanceSheet || !company.lastBalanceSheet) {
      company.lastBalanceSheet = lastBalanceSheetKey;
      await company.save();
    }

    // await this.database.rawBalanceSheetModel.deleteMany({accountantId, companyId});
    // await this.database.balanceSheetModel.deleteMany({accountantId, companyId});

    // Save each balance sheet
    await Promise.all(parsedRawBalanceSheets.map(async balanceSheet => {
      const { file, filename, month, year, accounts } = balanceSheet;
      // Save balance sheet file
      const savedFile = await this.balanceSheetUtils.saveBalanceSheetFile(file, filename, { accountantId, companyId });

      const rawBalanceSheet = {
        accounts,
        month: +month,
        year: +year,
        key: `${year}-${month}`,
        companyId,
        accountantId,
        fileId: savedFile._id,
        deleted: false
      };

      // Save raw balance sheet
      const updatedRawBalanceSheet = await this.database.rawBalanceSheetModel.findOneAndUpdate(
        { companyId, key: rawBalanceSheet.key },
        rawBalanceSheet,
        { upsert: true, setDefaultsOnInsert: true, new: true }
      );

      if (isStandardized) {
        // Save parsed balance sheet
        await this.balanceSheetUtils.parseRawBalanceSheet(updatedRawBalanceSheet);
      }

    }));

    return h.response({ isStandardized }).code(201);
  }

  public async listBalanceSheets(request: IRequest, h: Hapi.ResponseToolkit) {
    const companyId = request.params.companyId;
    const accountantId = request.params.accountantId;
    const key = request.params.key;
    try {
      let balanceSheets;
      if (key) {
        balanceSheets = await this.database.rawBalanceSheetModel.findOne({ companyId, accountantId, key, deleted: false });
        if (!balanceSheets) { return Boom.notFound(`Balance sheet ${key} for company ${companyId} not found`); }
      } else {
        balanceSheets = await this.database.rawBalanceSheetModel.find({ companyId, accountantId, deleted: false }).sort({ key: -1 });
        if (!balanceSheets.length) { return Boom.notFound(`Balance sheet ${key} for company ${companyId} not found`); }
      }
      return h.response(balanceSheets).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async exportBalanceSheet(request: IRequest, h: Hapi.ResponseToolkit) {
    const companyId = request.params.companyId;
    const accountantId = request.params.accountantId;
    const key = request.params.key;
    try {

      const company = await this.database.companyModel.findOne({ _id: companyId, accountantId });
      if (!company) { return Boom.notFound(`Company ${companyId} for accountant ${accountantId} not found`); }

      const balanceSheets = await this.database.rawBalanceSheetModel.findOne({ companyId, accountantId, key, deleted: false }).lean(true);
      if (!balanceSheets) { return Boom.notFound(`Balance sheet ${key} for company ${companyId} not found`); }

      const datePrefix = moment(`${balanceSheets.month}-${balanceSheets.year}`, 'MM-YYYY').format('YYYY_MM');

      const Converter = new ExcelWriter({
        sheets: [{
          name: 'Plano de Contas',
          key: 'accounts',
          headers: [
            { name: 'Código', key: 'code', },
            { name: 'Descrição', key: 'name', },
            { name: 'Saldo Inicial', key: 'previousBalance', },
            { name: 'Débito', key: 'debit', },
            { name: 'Crédito', key: 'credit', },
            { name: 'Saldo Final', key: 'currentBalance', }
          ]
        }]
      });

      await Promise.all(balanceSheets.accounts.map(account => {
        const cleanData = {
          code: account.code || '',
          name: account.name || '',
          previousBalance: account.previousBalance || 0,
          debit: account.debit || 0,
          credit: account.credit || 0,
          currentBalance: account.currentBalance || 0,
        };

        Converter.addData('accounts', cleanData);
      }));

      const stream = await Converter.save();

      const fileResult = await this.fileController.createXLSXFile(
        stream,
        `${datePrefix}_${company.name}`,
        company
      );

      if (fileResult.isError) {
        return Boom.badImplementation(fileResult.error);
      }

      return h.response(fileResult.result).code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async deleteBalanceSheet(request: IRequest, h: Hapi.ResponseToolkit) {
    const companyId = request.params.companyId;
    const accountantId = request.params.accountantId;
    const key = request.params.key;
    try {
      const rawBalanceSheet = await this.database.rawBalanceSheetModel.findOneAndUpdate({ companyId, accountantId, key}, { deleted: true }).lean(true);
      if (!rawBalanceSheet) { return Boom.notFound(`Balance sheet of ${key} not found`); }
      await this.database.balanceSheetModel.findOneAndUpdate({ companyId, accountantId, key }, { deleted: true });
      await this.fileController.deleteFile(rawBalanceSheet.fileId, { companyId, accountantId });

      const company = await this.database.companyModel.findById(companyId);
      if (company.lastBalanceSheet === key) {
        const bs = await this.database.rawBalanceSheetModel.find({ companyId, accountantId, deleted: false }).sort({ key: -1 });
        company.lastBalanceSheet = bs.length ? bs[0].key : null;
        company.save();
      }
      return h.response().code(200);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }
}
