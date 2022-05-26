import { IRawBalanceSheetAccount } from "../../api/balanceSheets/rawBalanceSheet";
import startsWith = require('lodash/startsWith');
import { codeToLevel } from './parserUtils';

export default class ContmaticParser {
  private isValidBalanceSheet(sheet: string[], delimiter?: string): boolean {
    if (sheet[sheet.length - 1].length < 23) { //23 is the min of chars to create a valid line
      sheet.splice(sheet.length - 1);
    }
    const numOfValidLines = sheet.filter(line => line.split(delimiter).length === 6).length;
    if (numOfValidLines < 5 || numOfValidLines > 10000) {
      return false;
    }
    return true;
  }

  public parse(sheet: string[]): IRawBalanceSheetAccount[] {
    const isValidTsv = this.isValidBalanceSheet(sheet, '	');
    const isValidBv = this.isValidBalanceSheet(sheet, '|');
    if (!isValidBv && !isValidTsv) {
      throw new Error('Arquivo Contmatic inválido');
    }

    const delimiter = isValidBv ? '|' : '	';

    const linesFields = sheet.filter(line => line.split(delimiter).length === 6).map(line => line.split(delimiter).map(field => field.trim()));

    const accounts = linesFields.map(line => {
      const account: IRawBalanceSheetAccount = {
        level: codeToLevel(line[0]),
        code: line[0],
        name: line[1],
        previousBalance: this.toNumber(delimiter, line[2], this.invertCreditDebit(line[0])),
        debit: this.toNumber(delimiter, line[3]),
        credit: this.toNumber(delimiter, line[4]),
        currentBalance: this.toNumber(delimiter, line[5], this.invertCreditDebit(line[0]))
      };

      return account;
    });

    return accounts;
  }

  private toNumber(delimiter: string, value: string, invertCreditDebit?: boolean) {
    if (delimiter === '	') { // tsv
      return parseFloat(value.replace(/,/g, '.').replace(/\s/g, ''));
    }

    const parts = value.replace(',', '.').split(' ');

    if (parts[1]) {
      const compareToInvert = invertCreditDebit ? 'D' : 'C';

      return parts[1] === compareToInvert ? +parts[0] : -1 * +parts[0];
    }

    return +parts[0];
  }

  private invertCreditDebit(code: string) {
    const isAsset = startsWith(code, '1');
    const isCostOrExpense = startsWith(code, '3.02');

    if (isAsset || isCostOrExpense) {
      return true;
    }

    return false;
  }
}
