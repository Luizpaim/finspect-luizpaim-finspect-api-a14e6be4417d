import * as Papa from 'papaparse';
import * as fs from 'fs';
import { IDatabase } from '../database';

export const populateAccounts = (database: IDatabase, path: string) => {
  const file = fs.readFileSync(path, 'utf-8');
  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: result => {
      result.data.map(acc => acc.level = codeToLevel(acc.code));
      database.balanceSheetAccountModel.create(result.data)
        .then(() => console.log('OK'))
        .catch(error => console.log(error));
    }
  });
};

const codeToLevel = (code: string) => {
  const sections = code.trim().split('.').map(Number);
  return sections.reduce((previousValue: number, currValue: number, currIndex: number) => {
    return currValue > 0 ? currIndex + 1 : previousValue;
  }, 0);
};