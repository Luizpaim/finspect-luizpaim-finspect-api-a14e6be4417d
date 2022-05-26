import { IRawBalanceSheetAccount } from "../../api/balanceSheets/rawBalanceSheet";
import { codeToLevel } from './parserUtils';
const XLSX = require('xlsx');

export default class DominioParser {
  public parse(buffer: Buffer): IRawBalanceSheetAccount[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Preamble; // for some reason, the sheet we want is created as a Preamble

    // array of sheet rows
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const validLines = data.map(row => {
      const [ externalCode,
        code,
        name,
        previousBalance,
        debit,
        credit,
        currentBalance,
      ] = row.filter(data => data !== null);

      return isNaN(externalCode) ? null : { code, name, previousBalance, debit, credit, currentBalance };
    }).filter(row => row !== null);

    const accounts = validLines.map((row): IRawBalanceSheetAccount => {
      return {
        level: codeToLevel(row.code),
        ...row,
      };
    });

    return accounts;
  }
}
