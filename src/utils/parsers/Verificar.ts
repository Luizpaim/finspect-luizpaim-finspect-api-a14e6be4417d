import { IRawBalanceSheetAccount } from "../../api/balanceSheets/rawBalanceSheet";
import { codeToLevel, ptbrStringToNumber as toNumber } from './parserUtils';
import { flatten } from "lodash";
const PDF = require('pdf-parse');

export default class VerificarParser {
  private DataStringRegex = /([\d.]+,..)/g;
  private groupData(data) {
    return data.reduce((groupedData, line) => {
      const lastGroup = groupedData.pop() || [];

      if (lastGroup.some(line => line.startsWith('Total Geral'))) {
        return [...groupedData, lastGroup, [line]];
      }

      lastGroup.push(line);
      return [...groupedData, lastGroup];
    }, []);
  }

  private parseGroupedData(data) {
    const [ groupName, ...groupData ] = data;
    const groupTotal = groupData.pop().replace('Total Geral', '');
    const accounts = [];

    let subGroupName;
    groupData.forEach(line => {
      if (!subGroupName) {
        subGroupName = line;
      } else {
        if (line.startsWith('Total do Grupo')) {
          const subGroupCode = accounts[accounts.length - 1].code.slice(0, -5);
          const account = this.dataToAccount(subGroupName, subGroupCode, line.replace('Total do Grupo', ''));
          accounts.push(account);
          subGroupName = undefined;
        } else {
          const { code, name, dataString } = this.getSubAccountData(line);
          const account = this.dataToAccount(name, code, dataString);

          accounts.push(account);
        }
      }
    }, this);

    const groupCode = accounts[accounts.length - 1].code[0];
    accounts.push(this.dataToAccount(groupName, groupCode, groupTotal));

    return accounts;
  }

  private getSubAccountData(line) {
    const code = line.slice(0, 13);
    const dataString = line.slice(13);

    const firstDataIndex = this.DataStringRegex.exec(dataString).index;
    const name = dataString.slice(0, firstDataIndex);

    return { code, name, dataString };
  }

  private dataToAccount(name, code, dataString): IRawBalanceSheetAccount {
    const [
      previousBalance,
      debit,
      credit,
      currentBalance
    ] = dataString.match(this.DataStringRegex);

    return {
      level: codeToLevel(code),
      code,
      name,
      previousBalance: toNumber(previousBalance),
      debit: toNumber(debit),
      credit: toNumber(credit),
      currentBalance: toNumber(currentBalance),
    };
  }

  public async parse(buffer: Buffer): Promise<IRawBalanceSheetAccount[]> {
    const rawData = (await PDF(buffer)).text.split('\n');
    const dataHeader = rawData.findIndex(line => line.startsWith('Conta'));
    const dataEnd = rawData.length - rawData.slice().reverse().findIndex(line => line.startsWith('Total Geral'));

    const data = rawData.slice(dataHeader + 1, dataEnd);

    return flatten(this.groupData(data).map(this.parseGroupedData, this));
  }
}
