import { IRawBalanceSheetAccount } from "../api/balanceSheets/rawBalanceSheet";
import { IDatabase } from "../database";
import GCSController from "./googleCloudStorage";
import groupBy = require('lodash/groupBy');
import flatMap = require('lodash/flatMap');
import { IBalanceSheetUniqueAccount } from "../api/balanceSheetAccountLink/balanceSheetUniqueAccount";
import { IAccountingSoftware } from "../api/accountingSoftwares/accountingSoftware";
import Parsers from './parsers';

export default class BalanceSheetUtils {
  private database: IDatabase;
  private storage: GCSController;

  constructor(database: IDatabase) {
    this.database = database;
    this.storage = new GCSController();
  }

  public async parseBalanceSheetFile(buffer: Buffer, accountingSoftware: IAccountingSoftware) {
    switch (accountingSoftware.name) {
      case 'Modelo 2 Contmat.bv':
        return Parsers.Contmatic.parse(this.parseBufferToLines(buffer));
      case 'Modelo 1':
      case 'Modelo 5':
        return Parsers.FerreiraDePaula.parse(this.parseBufferToLines(buffer));
      case 'Modelo 3':
        return Parsers.Dominio.parse(buffer);
      case 'Modelo 4':
        return await Parsers.Verificar.parse(buffer);
      default:
        throw new Error(`Software "${accountingSoftware.name}" não é suportado.`);
    }
  }

  private parseBufferToLines(buffer: Buffer): string[] {
    const fileString = buffer.toString('latin1');

    const lineBreak = fileString.indexOf('\r\n') > -1 ? '\r\n' : '\n';
    const emptyLines = (line: string) => line && !!line.replace(/\s/g, '').length;

    const lines = fileString.split(lineBreak).filter(emptyLines);

    return lines;
  }

  public async isStandardized(accountantId: string, companyId: string) {
    let docs = await this.database.balanceSheetUniqueAccountModel.find({ accountantId, companyId }).lean(true);
    if (!docs) {
      return false;
    }
    const maxLevel = Math.max.apply(Math, docs.map(o => o.level));
    docs = docs.filter(doc => doc.level === maxLevel);
    const exists = docs.find(doc => !doc.internalAccountCode);
    return !Boolean(exists);
  }

  public async parseRawBalanceSheet(rawBalanceSheets: any | any[]) {
    const parser = async rawBs => {
      const standardAccounts = await this.parseRawAccounts(rawBs.accounts, rawBs.companyId);
      const balanceSheet = {
        accounts: standardAccounts,
        month: rawBs.month,
        year: rawBs.year,
        key: rawBs.key,
        companyId: rawBs.companyId,
        accountantId: rawBs.accountantId,
        rawId: rawBs._id,
        deleted: false
      };
      await this.database.balanceSheetModel.findOneAndUpdate(
        { companyId: balanceSheet.companyId, key: balanceSheet.key },
        balanceSheet,
        { upsert: true, setDefaultsOnInsert: true }
      );
      return { error: false };
    };

    if (Array.isArray(rawBalanceSheets)) {
      return await Promise.all(rawBalanceSheets.map(parser));
    } else {
      return await parser(rawBalanceSheets);
    }
  }

  public async getAccountsDictionary(companyId: string) {
    let parameters = await this.database.balanceSheetUniqueAccountModel.find({ companyId, "internalAccountCode": { "$exists": true } }).lean(true);
    if (parameters) {
      return parameters.reduce((acumulator, value) => {
        acumulator[value.code] = value.internalAccountCode;
        return acumulator;
      }, {});
    }
    return null;
  }

  public async parseRawAccounts(rawAccounts: IRawBalanceSheetAccount[], companyId: string) {
    const dict = await this.getAccountsDictionary(companyId);
    const standardAccounts: any[] = await this.database.balanceSheetAccountModel.find({ deleted: false }).lean(true);

    const rawMaxLevel = Math.max.apply(Math, rawAccounts.map(o => o.level));
    const maxLevel = Math.max.apply(Math, standardAccounts.map(o => o.level));

    const accByLevel = groupBy(standardAccounts, 'level');
    const rawAccByLevel = groupBy(rawAccounts, 'level');

    accByLevel[maxLevel.toString()] = accByLevel[maxLevel.toString()].map(acc => {
      acc['previousBalance'] = 0;
      acc['debit'] = 0;
      acc['credit'] = 0;
      acc['currentBalance'] = 0;

      rawAccByLevel[rawMaxLevel.toString()].forEach(rawAcc => {
        if (dict[rawAcc.code] === acc.code) {
          acc.previousBalance += rawAcc.previousBalance;
          acc.debit += rawAcc.debit;
          acc.credit += rawAcc.credit;
          acc.currentBalance += rawAcc.currentBalance;
        }
      });
      return acc;
    });

    for (let i = maxLevel - 1; i > 0; i--) {
      accByLevel[i.toString()] = accByLevel[i.toString()].map(acc => {
        acc['previousBalance'] = 0;
        acc['debit'] = 0;
        acc['credit'] = 0;
        acc['currentBalance'] = 0;

        const rawCodes = Object.entries(dict)
          .filter(([rawCode, code]) => code === acc.code)
          .map(([rawCode, ]) => rawCode);

        if (rawCodes.length) {
          // gets data from raw file
          rawAccounts
            .filter(rawAcc => rawCodes.includes(rawAcc.code))
            .forEach(rawAcc => {
              acc.previousBalance += rawAcc.previousBalance;
              acc.debit += rawAcc.debit;
              acc.credit += rawAcc.credit;
              acc.currentBalance += rawAcc.currentBalance;
            });
        } else {
          // sums children to compute higher level data
          accByLevel[(i + 1).toString()].forEach(childAcc => {
            if (this.isDirectChild(acc.code, childAcc.code)) {
              acc.previousBalance += childAcc.previousBalance;
              acc.debit += childAcc.debit;
              acc.credit += childAcc.credit;
              acc.currentBalance += childAcc.currentBalance;
            }
          });
        }

        return acc;
      });
    }

    return flatMap(accByLevel, it => it);
  }

  private isDirectChild(code: string, childCode: string) {
    if (!code || !childCode) {
      return false;
    }
    code = code.split('.').filter(part => parseInt(part, 10) > 0).join('.');
    const cCode = childCode.split('.').filter(part => parseInt(part, 10) > 0);
    cCode.splice(-1);
    return code === cCode.join('.');
  }

  public async saveBalanceSheetFile(buffer: Buffer, filename: string, opts: any) {
    const { accountantId, companyId } = opts;
    const { size, url } = await this.storage.uploadBuffer(buffer, `${accountantId}-${companyId}`, filename);
    const splitedName = filename.split('.');
    const extension = splitedName.pop();
    filename = splitedName.join('.');
    const splittedUrl = url.split('/');
    splittedUrl.pop();
    const hash = splittedUrl.pop();
    const originalFilename = `${hash}/${filename}`;

    return this.database.fileModel.findOneAndUpdate(
      {
        accountantId,
        companyId,
        filename,
        type: 'balancesheet',
      },
      {
        accountantId,
        companyId,
        filename,
        originalFilename,
        extension,
        type: 'balancesheet',
        url,
        size,
        deleted: false
      }, { upsert: true, setDefaultsOnInsert: true, new: true });
  }

  public async autoLinking(accountantId: string, companyId: string, accounts: object[]) {
    const uniqueAccounts = await this.database.balanceSheetUniqueAccountModel.find(
      { accountantId, "internalAccountCode": { "$exists": true } }
    ).lean(true);

    const uniqueAccountModelUpdates: Promise<IBalanceSheetUniqueAccount>[] = accounts.map((account) => {
      const uniqueAccountMatch = uniqueAccounts.find(uA => (
        uA['code'] === account['code'] &&
        uA['name'] === account['name'] &&
        uA['internalAccountCode']
      ));

      if (uniqueAccountMatch) {
        return this.database.balanceSheetUniqueAccountModel
          .findOneAndUpdate(
            { accountantId, companyId, code: account['code'], "internalAccountCode": { "$exists": false } },
            { internalAccountCode: uniqueAccountMatch['internalAccountCode'] }
          )
          .exec();
      }
    });

    return Promise.all(uniqueAccountModelUpdates);
  }
}
