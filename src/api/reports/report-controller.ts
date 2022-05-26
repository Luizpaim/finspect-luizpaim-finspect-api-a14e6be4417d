import * as Hapi from "hapi";
import * as Boom from "boom";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";
import { IRequest } from "../../interfaces/request";
import keyBy = require("lodash/keyBy");
import every = require("lodash/every");
import * as moment from 'moment';
import 'moment/locale/pt-br';
import { ISituation, SituationGroups } from "../situations/situation";
import { formatNumber } from "../../utils/reportFunctions";

export default class ReportController {
  private database: IDatabase;
  private configs: IServerConfigurations;

  constructor(configs: IServerConfigurations, database: IDatabase) {
    this.configs = configs;
    this.database = database;
  }

  public async getAnalysis(request: IRequest, h: Hapi.ResponseToolkit) {
    const companyId = request.params.companyId;
    const accountantId = request.params.accountantId;
    const company = await this.database.companyModel.findOne({ _id: companyId, accountantId, deleted: false });

    if (!company) {
      return Boom.notFound();
    }

    const frequency = request.query['frequency'];
    const year = request.query['year'];

    let bsheets;

    switch (frequency) {
      case 'monthly':
        bsheets = await this.database.balanceSheetModel.find({ year, companyId, accountantId, deleted: false }).sort({ month: 1 }).lean(true);
        break;
      case 'quarterly':
        const months = [3, 6, 9, 12];
        bsheets = await this.database.balanceSheetModel.find({ year, month: { $in: months }, companyId, accountantId, deleted: false }).sort({ month: 1 }).lean(true);
        break;
      case 'yearly':
        const years = [year - 2, year - 1, year];
        bsheets = await this.database.balanceSheetModel.find({ year: { $in: years }, month: 12, companyId, accountantId, deleted: false }).sort({ year: 1 }).lean(true);
        break;
    }

    const indicators = await this.database.indicatorModel.find({ deleted: false });
    const indicatorsByName = keyBy(indicators, indicator => indicator.name.toLowerCase());

    const bsheetsByAccount = bsheets.map(bsheet => (
      bsheet['accounts'].reduce((mappedObj, currentAccount) => {
        mappedObj[currentAccount.code] = currentAccount.currentBalance;
        return mappedObj;
      }, {})
    ));

    // functions that are created to be in context for eval
    const formatar = formatNumber;
    const ANO = index => {
      if (index < 1 || index > 3) {
        throw EvalError('Ano inválido');
      }

      return year - 3 + index;
    };
    const TRIMESTRE = index => {
      if (index < 1 || index > 4) {
        throw EvalError('Trimestre inválido');
      }

      return `T${index}/${year}`;
    };
    const MES = index => {
      if (index < 1 || index > 12) {
        throw EvalError('Mês inválido');
      }

      moment.locale('pt-br');

      return moment(`${index}-${year}`, 'MM-YYYY').format('MMM-YYYY');
    };

    const evaluateSituation = (situation: ISituation): string => {
      const { formulas } = situation;

      const conta = (code: string, period: number) => {
        const periodData = bsheetsByAccount[period - 1];
        if (!periodData) {
          throw EvalError('Período inválido');
        }

        if (!periodData[code]) {
          throw EvalError('Conta inválida');
        }

        return periodData[code];
      };

      const evaluateContas = (str: string, indicatorPeriod?: number) => {
        const extractContasRegex = /conta\s*\('([^']*)'(?:,\s*(\d))?\)/gi;
        return str.replace(extractContasRegex, (match, code, contaPeriod) => conta(code, contaPeriod || indicatorPeriod));
      };

      const indicador = (name: string, period: number) => {
        const indicator = indicatorsByName[name.toLowerCase()];
        if (!indicator || !indicator.formula) {
          throw EvalError('Indicador inválido');
        }

        const { formula } = indicator;

        return eval(evaluateContas(formula, period));
      };

      const evaluateIndicators = str => {
        const extractIndicadoresRegex = /indicador\s*\('([^']*)'(?:,\s*(\d+))?\)/gi;
        return str.replace(extractIndicadoresRegex, (match, name, period) => indicador(name, period));
      };

      const evaluateReferences = str => evaluateContas(evaluateIndicators(str));

      const formulaIntoExpression = ({ expression, operator, value }) => `(${evaluateReferences(expression)}) ${operator} (${evaluateReferences(value)})`;

      const evaluateMessage = message => eval('`' + evaluateReferences(message) + '`');

      try {
        const expressions = formulas.map(formulaIntoExpression);

        return every(expressions, eval) ? evaluateMessage(situation.message) : '';
      } catch (e) {
        return '';
      }
    };

    const situations = await this.database.situationModel.find({ frequency, deleted: false, active: true }).sort("order");
    const orderedSituations = SituationGroups
      .map(group => situations.filter(situation => situation.group === group))
      .reduce((situations, groupSituations) => [...situations, ...groupSituations], []);

    const msgs = orderedSituations.map(evaluateSituation).filter(msg => msg !== '');

    return h.response(msgs).code(200);
  }

  public async getFinancialDemo(request: IRequest, h: Hapi.ResponseToolkit) {
    const companyId = request.params.companyId;
    const accountantId = request.params.accountantId;
    const company = await this.database.companyModel.findOne({ _id: companyId, accountantId, deleted: false });
    if (!company) {
      return Boom.notFound();
    }
    const years = [+request.query['from'], +request.query['from'] + 1, +request.query['from'] + 2];
    const accountsPerYear = await Promise.all(years.map(async year => {
      let month = 12;
      let bs;
      if (year === moment().year()) {
        bs = await this.database.balanceSheetModel.find({ year, companyId, accountantId, deleted: false }).sort({ month: -1 }).lean(true);
        bs = bs[0];
      } else {
        bs = await this.database.balanceSheetModel.findOne({ year, month, companyId, accountantId, deleted: false }).lean(true);
      }
      if (bs) {
        return bs.accounts.reduce((mappedObj, currentAccount) => {
          mappedObj[currentAccount.code] = currentAccount.currentBalance;
          return mappedObj;
        }, {});
      }
      return null;
    }));
    const resp = years.reduce((obj, year) => {
      obj[year.toString()] = accountsPerYear[year - years[0]];
      return obj;
    }, {});
    return h.response(resp).code(200);
  }
}
