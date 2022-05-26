import { IRawBalanceSheetAccount } from "../../api/balanceSheets/rawBalanceSheet";
import { codeToLevel, ptbrStringToNumber as toNumber } from './parserUtils';

export default class FerreiraDePaulaParser {
  private DELIMITER_CSV = ';';
  private DELIMITER_TXT = '\\t';
  private buildLineRegex = delimiter =>
    RegExp(`^\\d+${delimiter}+([^${delimiter}]+)${delimiter}+([^${delimiter}]+)${delimiter}+([^${delimiter}]+)${delimiter}+([^${delimiter}]+)${delimiter}+([^${delimiter}]+)${delimiter}+([^${delimiter}]+)${delimiter}+`)

  public parse(sheet: string[]): IRawBalanceSheetAccount[] {
    const csvRegex = this.buildLineRegex(this.DELIMITER_CSV);
    const txtRegex = this.buildLineRegex(this.DELIMITER_TXT);

    const csvLines = sheet.filter(line => csvRegex.test(line));
    const txtLines = sheet.filter(line => txtRegex.test(line));

    if (!csvLines.length && !txtLines.length) {
      throw new Error('Arquivo FerreiraDePaula inválido');
    }

    let validLines, lineRegex;
    if (csvLines.length) {
      validLines = csvLines;
      lineRegex = csvRegex;
    } else {
      validLines = txtLines;
      lineRegex = txtRegex;
    }

    const accounts = validLines.map((line: string): IRawBalanceSheetAccount => {
      const [,
        code,
        name,
        previousBalance,
        debit,
        credit,
        currentBalance
      ] = line.match(lineRegex);

      return {
        level: codeToLevel(code),
        code,
        name,
        previousBalance: toNumber(previousBalance),
        debit: toNumber(debit),
        credit: toNumber(credit),
        currentBalance: toNumber(currentBalance),
      };
    });

    return accounts;
  }
}
