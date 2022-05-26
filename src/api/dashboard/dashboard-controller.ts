import * as Hapi from "hapi";
import * as Boom from "boom";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";
import { IRequest } from "../../interfaces/request";
import * as moment from "moment";
import "moment/locale/pt-br";
import range = require("lodash/range");
import keyBy = require("lodash/keyBy");
import orderBy = require("lodash/orderBy");
import clone = require("lodash/clone");
import startsWith = require("lodash/startsWith");
import chunk = require("lodash/chunk");
import first = require("lodash/first");
import last = require("lodash/last");
import BalanceSheetUtils from "../../utils/balanceSheetUtils";
import { BsheetPeriod, BsheetChunkingConfigObject, BsheetChunk } from "../../interfaces/dashboard";

export default class DashboardController {
  private database: IDatabase;
  private configs: IServerConfigurations;
  private balanceSheetUtils: BalanceSheetUtils;
  private chunkSizes = [1, 3, 12];

  constructor(configs: IServerConfigurations, database: IDatabase) {
    this.configs = configs;
    this.database = database;
    this.balanceSheetUtils = new BalanceSheetUtils(database);
    moment.locale("pt-BR");
  }

  public async getDashboardData(request: IRequest, h: Hapi.ResponseToolkit) {
    const companyId = request.params.companyId;
    const accountantId = request.params.accountantId;

    const company = await this.database.companyModel
      .findOne({ _id: companyId, accountantId, deleted: false, isActive: true })
      .lean(true);

    if (!company) {
      return Boom.notFound(`Company ${companyId} does not exist`);
    }
    if (
      !(await this.balanceSheetUtils.isStandardized(accountantId, companyId))
    ) {
      return Boom.forbidden("Parameterization for this company was not found");
    }

    const years = this.getPeriods(request.query["from"], request.query["to"]);
    const bsheets = await Promise.all(years.map(
      async year => this.database.balanceSheetModel.find({ year, companyId, accountantId, deleted: false }).lean(true)
    ));

    const mappedBsheets: Array<BsheetPeriod> = bsheets.reduce((previousMappedBsheets: Array<BsheetPeriod>, bsheetArray: Array<Object>, currentIndex) => {
      const currentYear = years[currentIndex];
      const bsheetByMonth = keyBy(bsheetArray, bsheet => bsheet["month"] - 1);
      const orderedBsheetArray = orderBy(bsheetArray, ["month"], ["desc"]);

      const currentYearMappedBsheets = Array.from(Array(12).keys()).map(month => {
        let bsheet = bsheetByMonth[month];
        let accounts = [];

        if (bsheetArray && bsheetArray.length) {
          if (!bsheet) {
            bsheet = clone(orderedBsheetArray.find(someBSheet => (someBSheet["month"] - 1) < month) || first(orderedBsheetArray));
            bsheet["accounts"] = bsheet["accounts"].map(account => startsWith(account.code, "3") ? (
              {
                ...account,
                currentBalance: 0
              }
            ) : account);
          }

          accounts = bsheet["accounts"].reduce((mappedObj, currentAccount) => {
            mappedObj[currentAccount.code] = currentAccount.currentBalance;
            return mappedObj;
          }, {});
        }

        const date = moment().month(month).year(currentYear).format("MM/YYYY");
        const resp = {
          date: "",
          resumo: null,
          evolucaoReceita: null,
          evolucaoDespesas: null,
          composicaoDespesas: null,
          resultado: null,
          tesourariaSimples: null,
          composicaoDoAtivo: null,
          composicaoDoPassivo: null,
          indicadores: null,
          ciclosEFluxoDeCaixa: null,
        };

        resp.date = date;
        resp.resumo = this.getSummary(accounts);
        resp.evolucaoReceita = this.getRevenueEvolution(accounts);
        resp.evolucaoDespesas = this.getCostsEvolution(accounts);
        resp.composicaoDespesas = this.getExpensesComposition(accounts);
        resp.resultado = this.getResult(accounts);
        resp.tesourariaSimples = this.getSimpleTreasury(accounts);
        resp.composicaoDoAtivo = this.getAssetComposition(accounts);
        resp.composicaoDoPassivo = this.getPassiveComposition(accounts);
        resp.indicadores = this.getMainIndicators(accounts);
        resp.ciclosEFluxoDeCaixa = this.getCiclosEFluxoDeCaixa(accounts);

        return resp;
      });

      return [...previousMappedBsheets, ...currentYearMappedBsheets];

    }, []);

    const chunkedBsheets: Array<BsheetChunk> = this.chunkSizes.map(this.reduceBsheetsToChunks(mappedBsheets));

    return h.response(chunkedBsheets).code(200);
  }

  private toNumber(number: any) {
    if (isNaN(Number(number))) {
      return 0;
    }

    return Number(number);
  }

  private getPeriods(initialDate: string, finalDate: string) {
    const iYear = moment(initialDate, "MM/YYYY").year();
    const fYear = moment(finalDate, "MM/YYYY").year();

    return range(iYear - 1, fYear + 1);
  }

  private getSummary(accounts: any[]) {
    const receita = this.toNumber(accounts["3.01.00.00"]);
    const lucro = this.toNumber(accounts["3.01.00.00"] + accounts["3.02.00.00"]);

    const gastos = receita - lucro;

    const resultado = { receita, gastos, lucro };

    const roe = this.toNumber(accounts["3.00.00.00"] / accounts["2.03.00.00"]);
    const roa = this.toNumber(accounts["3.00.00.00"] / accounts["1.00.00.00"]);
    const indiceDeRentabilidade = { roe, roa };

    const { caixaAtual: caixa } = this.getSimpleTreasury(accounts);

    const ncg = this.toNumber(accounts["1.01.02.00"] - accounts["2.01.02.00"]);

    const composicaoAtivoPassivo = {
      ativo: this.getAssetComposition(accounts).circulante,
      passivo: this.getPassiveComposition(accounts).circulante
    };

    return { resultado, caixa, indiceDeRentabilidade, ncg, composicaoAtivoPassivo };
  }

  private getRevenueEvolution(accounts: any[]) {
    return { receita: this.toNumber(accounts["3.01.01.01"]) };
  }

  private getCostsEvolution(accounts: any[]) {
    const custos = this.toNumber(accounts["3.02.01.00"]);

    const operacionais = this.toNumber(
      accounts["3.02.03.00"] +
        accounts["3.02.02.01"] +
        accounts["3.02.02.02"] +
        accounts["3.02.02.03"] +
        accounts["3.02.02.04"] +
        accounts["3.02.02.05"] +
        accounts["3.02.02.06"] +
        accounts["3.02.02.07"] +
        accounts["3.02.02.09"] +
        accounts["3.02.02.10"]
    );
    const tributos = this.toNumber(
      accounts["3.02.02.08"] + accounts["3.02.05.00"] +
      accounts["3.01.01.02"] + accounts["3.01.01.03"]
    );
    const financeiras = this.toNumber(accounts["3.02.04.00"]);
    const despesas = { operacionais, tributos, financeiras };

    return { custos, despesas };
  }

  private getExpensesComposition(accounts: any[]) {
    const proLaboreSalarios = this.toNumber(accounts['3.02.02.01']);
    const beneficiosEmpregados = this.toNumber(accounts['3.02.02.02']);
    const encargosSobreSalarios = this.toNumber(accounts['3.02.02.03']);
    const provisoesDeSalarios = this.toNumber(accounts['3.02.02.04']);
    const folhaDePagamento = this.toNumber(proLaboreSalarios + beneficiosEmpregados + encargosSobreSalarios + provisoesDeSalarios);

    const marketingVendas = this.toNumber(accounts['3.02.02.05']);

    const administrativas = this.toNumber(accounts['3.02.02.06']);
    const depreciacaoDespesas = this.toNumber(accounts['3.02.02.10']);
    const servicosPrestados = this.toNumber(accounts['3.02.02.07']);
    const outrasDespesas = this.toNumber(accounts['3.02.02.09']);
    const naoOperacional = this.toNumber(accounts['3.02.03.01']);
    const administrativaEOutros = this.toNumber(administrativas + depreciacaoDespesas + servicosPrestados + outrasDespesas + naoOperacional);

    const taxasContribuicoes = this.toNumber(accounts['3.02.02.08']);
    const tributosSobreLucro = this.toNumber(accounts['3.02.05.00']);
    const abatimentosDevolucoes = this.toNumber(accounts['3.01.01.02']);
    const impostosSobreReceita = this.toNumber(accounts['3.01.01.03']);
    const impostos = this.toNumber(taxasContribuicoes + tributosSobreLucro + abatimentosDevolucoes + impostosSobreReceita);

    const financeirasEJuros = this.toNumber(accounts['3.02.04.01']);

    const despesas = {
      folhaDePagamento: {
        total: folhaDePagamento,
        proLaboreSalarios,
        beneficiosEmpregados,
        encargosSobreSalarios,
        provisoesDeSalarios,
      },
      marketingVendas,
      administrativaEOutros: {
        total: administrativaEOutros,
        administrativas,
        depreciacaoDespesas,
        servicosPrestados,
        outrasDespesas,
        naoOperacional,
      },
      impostos: {
        total: impostos,
        taxasContribuicoes,
        tributosSobreLucro,
        abatimentosDevolucoes,
        impostosSobreReceita,
      },
      financeirasEJuros,
    };

    return despesas;
  }

  private getResult(accounts: any[]) {
    const receita = accounts["3.01.01.01"] + accounts["3.01.02.00"] + accounts["3.01.03.01"] + accounts["3.01.04.00"];
    const receitaLiquida = this.toNumber(accounts["3.01.01.00"]);

    const lucro = this.toNumber(accounts["3.00.00.00"]);

    const { custos: custo } = this.getCostsEvolution(accounts);
    const despesa = lucro - receita - custo;

    return {
      receita,
      receitaLiquida,
      custo,
      despesa,
      lucro,
    };
  }

  private getSimpleTreasury(accounts: any[]) {
    const caixaAtual = this.toNumber(accounts["1.01.01.01"] + accounts["1.01.01.02"]);
    const { liquidez } = this.getMainIndicators(accounts);

    return {
      caixaAtual,
      liquidezCorrente: liquidez.corrente,
      liquidezSeca: liquidez.seca,
      liquidezImediata: liquidez.imediata,
    };
  }

  private getAssetComposition(accounts: any[]) {
    // circulante
    const caixaEEquivalente = this.toNumber(
      accounts["1.01.01.01"] + accounts["1.01.01.02"]
    );
    const contasAReceber = this.toNumber(accounts["1.01.02.01"]);
    const estoque = this.toNumber(accounts["1.01.02.02"]);
    const outrosCreditos = this.toNumber(
      accounts["1.01.00.00"] - caixaEEquivalente - contasAReceber - estoque
    );
    const circulante = {
      caixaEEquivalente,
      contasAReceber,
      estoque,
      outrosCreditos,
    };
    // nao circulante
    const longoPrazo = this.toNumber(accounts["1.02.01.00"]);
    const investimentos = this.toNumber(accounts["1.02.02.00"]);
    const imobilizado = this.toNumber(accounts["1.02.03.00"]);
    const naoCirculante = { longoPrazo, investimentos, imobilizado };

    return { circulante, naoCirculante };
  }

  private getPassiveComposition(accounts: any[]) {
    // circulante
    const fornecedorEContas = this.toNumber(
      accounts["2.01.02.03"] + accounts["2.01.02.04"]
    );
    const emprestimosEFinanciamentos = this.toNumber(accounts["2.01.01.01"]);
    const obrigacoesTrabalhistasEFiscais = this.toNumber(
      accounts["2.01.02.01"] + accounts["2.01.02.02"] + accounts["2.01.02.05"] + accounts["2.01.02.06"]
    );
    const outrasContas = this.toNumber(
      accounts["2.01.00.00"] -
        fornecedorEContas -
        emprestimosEFinanciamentos -
        obrigacoesTrabalhistasEFiscais
    );
    const circulante = {
      fornecedorEContas,
      emprestimosEFinanciamentos,
      obrigacoesTrabalhistasEFiscais,
      outrasContas,
    };

    // nao circulante
    const financiamentos = this.toNumber(accounts["2.02.01.01"]);
    const patrimonioLiquido = this.toNumber(accounts["2.03.00.00"]);
    const outras = this.toNumber(accounts["2.02.00.00"] - financiamentos);
    const naoCirculante = {
      financiamentos,
      patrimonioLiquido,
      outrasContas: outras,
    };

    return { circulante, naoCirculante };
  }

  private getMainIndicators(accounts: any[]) {
    // liquidez
    const geral = this.toNumber(
      (accounts["1.01.00.00"] + accounts["1.02.01.00"]) /
        (accounts["2.01.00.00"] + accounts["2.02.01.00"])
    );
    const corrente = this.toNumber(
      accounts["1.01.00.00"] / accounts["2.01.00.00"]
    );
    const seca = this.toNumber(
      (accounts["1.01.00.00"] - accounts["1.01.02.02"]) / accounts["2.01.00.00"]
    );
    const imediata = this.toNumber(
      (accounts["1.01.01.01"] + accounts["1.01.01.02"]) / accounts["2.01.00.00"]
    );
    const liquidez = {
      geral,
      corrente,
      seca,
      imediata,
    };

    // estrutura
    const imobilizacaoDoPatrimonioLiquido = this.toNumber(
      accounts["1.02.03.00"] / accounts["2.03.00.00"]
    );
    const participacaoCapitalDeTerceiros = this.toNumber(
      (accounts["2.01.00.00"] + accounts["2.02.01.00"]) / accounts["2.03.00.00"]
    );
    const endividamentoBancario = this.toNumber(
      (accounts["2.01.01.01"] + accounts["2.02.01.01"]) / accounts["2.03.00.00"]
    );
    const composicaoDaDivida = this.toNumber(
      accounts["2.01.00.00"] / (accounts["2.01.00.00"] + accounts["2.02.01.00"])
    );
    const capitalDeTerceiros = this.toNumber(
      accounts["2.01.00.00"] + accounts["2.02.01.00"]
    );
    const garantiaDoCPaoCT = this.toNumber(
      accounts["2.03.00.00"] / (accounts["2.01.00.00"] + accounts["2.02.01.00"])
    );
    const composicaoDoCapital = this.toNumber(
      accounts["2.03.00.00"] / accounts["1.00.00.00"]
    );
    const indiceDeSolvencia = this.toNumber(
      accounts["1.00.00.00"] / (accounts["2.01.00.00"] + accounts["2.02.01.00"])
    );
    const dividaLiquidaPL = this.toNumber(
      (accounts["2.01.01.01"] +
        accounts["2.02.01.01"] -
        accounts["1.01.01.01"] -
        accounts["1.01.01.02"]) /
        accounts["2.03.00.00"]
    );
    const estrutura = {
      imobilizacaoDoPatrimonioLiquido,
      participacaoCapitalDeTerceiros,
      endividamentoBancario,
      composicaoDaDivida,
      capitalDeTerceiros,
      garantiaDoCPaoCT,
      composicaoDoCapital,
      indiceDeSolvencia,
      dividaLiquidaPL,
    };

    // rentabilidade
    const margemOperacionalBruta = this.toNumber(
      (accounts["3.01.01.00"] + accounts["3.02.01.00"]) / accounts["3.01.01.00"]
    );
    const margemOperacionalLiquida = this.toNumber(
      (accounts["3.01.01.00"] +
        accounts["3.02.01.00"] +
        accounts["3.02.02.00"] +
        accounts["3.02.04.00"] +
        accounts["3.01.03.00"] +
        accounts["3.01.02.00"]) /
        accounts["3.01.01.00"]
    );
    const margemLiquida = this.toNumber(
      accounts["3.00.00.00"] / accounts["3.01.01.00"]
    );
    const rentabilidadeOperacional = this.toNumber(
      accounts["3.00.00.00"] / accounts["1.00.00.00"]
    );
    const giroDoAtivoOperacional = 0;
    const retornoSobreAtivoOperacional = 0;
    const retornoSobrePatrimonioLiquido = this.toNumber(
      accounts["3.00.00.00"] / accounts["2.03.00.00"]
    );
    const rentabilidade = {
      margemOperacionalBruta,
      margemOperacionalLiquida,
      margemLiquida,
      giroDoAtivoOperacional,
      retornoSobreAtivoOperacional,
      rentabilidadeOperacional,
      retornoSobrePatrimonioLiquido,
    };

    // necessidade financeira
    const necessidadeLiquidaDeCapitalDeGiro = this.toNumber(
      accounts["1.01.02.00"] - accounts["2.01.02.00"]
    );
    const tesouraria = this.toNumber(
      accounts["1.01.01.00"] - accounts["2.01.01.00"]
    );
    const capitalCirculanteLiquido = this.toNumber(
      accounts["1.01.00.00"] - accounts["2.01.00.00"]
    );
    const fluxoDeLongoPrazo = this.toNumber(
      accounts["1.02.01.00"] - accounts["2.02.01.00"]
    );
    const capitalCirculanteProprio = this.toNumber(
      accounts["2.03.00.00"] - accounts["1.02.03.00"]
    );
    const NLCDGROL = this.toNumber(
      necessidadeLiquidaDeCapitalDeGiro / accounts["3.01.01.00"]
    );
    const necessidadeFinanceira = {
      necessidadeLiquidaDeCapitalDeGiro,
      tesouraria,
      capitalCirculanteLiquido,
      fluxoDeLongoPrazo,
      capitalCirculanteProprio,
      NLCDGROL,
    };

    // ciclo
    const contasAReceber = 0;
    const estoques = 0;
    const fornecedores = 0;
    const cicloOperacional = 0;
    const cicloFinanceiro = 0;
    const ciclo = {
      contasAReceber,
      estoques,
      fornecedores,
      cicloOperacional,
      cicloFinanceiro,
    };

    //cobertura
    const EBITDA =
      accounts["3.01.01.00"] +
      accounts["3.02.01.00"] +
      accounts["3.02.02.00"] +
      accounts["3.01.03.01"] -
      accounts["3.02.01.02"] -
      accounts["3.02.02.10"];
    const dividaBruta = accounts["2.01.01.01"] + accounts["2.02.01.01"];
    const dividaLiquida =
      dividaBruta - accounts["1.01.01.01"] - accounts["1.01.01.02"];

    const indiceDeCoberturaDeJuros = this.toNumber(
      EBITDA / (accounts["3.01.02.00"] + accounts["3.02.04.00"])
    );
    const dividaLiquidaEBITDA = this.toNumber(dividaLiquida / EBITDA);
    const EBITDAdividaBruta = this.toNumber(EBITDA / dividaBruta);
    const EBITDAdividaLiquida = this.toNumber(EBITDA / dividaLiquida);
    const cobertura = {
      indiceDeCoberturaDeJuros,
      dividaLiquidaEBITDA,
      EBITDA,
      EBITDAdividaBruta,
      EBITDAdividaLiquida,
    };

    // fluxo de caixa
    const fluxoDeCaixaOperacional = 0;
    const FCODividaBruta = 0;
    const fluxoDeCaixa = {
      fluxoDeCaixaOperacional,
      FCODividaBruta,
    };

    return {
      liquidez,
      estrutura,
      rentabilidade,
      necessidadeFinanceira,
      ciclo,
      cobertura,
      fluxoDeCaixa,
    };
  }

  private getCiclosEFluxoDeCaixa(accounts: any[]) {
    return {};
  }

  private buildBsheetChunkingConfigObject = (date: string, index: number, chunkSize: number, chunkedBsheets: BsheetPeriod[][]) => {
    const currentDate = moment();
    const getMonth = str => moment(str, 'MM/YYYY').month();

    const isYearly = chunkSize === 12;

    const previousMonthArray = chunkedBsheets[index - 1];
    const yearBehindMonthArray = chunkedBsheets[index - (12 / chunkSize)];

    const januaryMonthArray = chunkSize === 1 && getMonth(date) ? chunkedBsheets[index - (getMonth(date))] : null;
    const previousYearMonthArray = yearBehindMonthArray && getMonth(first(yearBehindMonthArray).date) === getMonth(date) ?
      yearBehindMonthArray :
      undefined;

    const configs: BsheetChunkingConfigObject = {
      previousMonthArray,
      previousYearMonthArray,
      januaryMonthArray,
      isFirstPeriod: (isYearly || getMonth(date) < chunkSize) || !previousMonthArray,
      isYearly,
      isYearlyAndCurrentYear: isYearly && moment(date, 'MM/YYYY').isSame(currentDate, 'year'),
      previousMonth: currentDate.month() - 1,
    };

    return configs;
  }

  private reduceBsheetsToChunks = (mappedBsheets: Array<BsheetPeriod>) => (chunkSize: number) => {
    const chunkedBsheets: BsheetChunk = { chunkSize, data: null };

    chunkedBsheets.data = chunk(mappedBsheets, chunkSize).reduce((processedData, monthArray, index, chunkedBsheets): Array<BsheetPeriod> => {
      const { date } = first(monthArray);
      const configs = this.buildBsheetChunkingConfigObject(date, index, chunkSize, chunkedBsheets);

      return [
        ...processedData,
        {
          date,
          resumo: this.processSummaryChunk(monthArray, configs),
          evolucaoReceita: this.processRevenueEvolutionChunk(monthArray, configs),
          evolucaoDespesas: this.processCostsEvolutionChunk(monthArray, configs),
          composicaoDespesas: this.processExpensesCompositionChunk(monthArray, configs),
          resultado: this.processResultChunk(monthArray, configs),
          tesourariaSimples: this.processSimpleTreasuryChunk(monthArray, configs),
          composicaoDoAtivo: this.processAssetCompositionChunk(monthArray),
          composicaoDoPassivo: this.processPassiveCompositionChunk(monthArray),
          indicadores: this.processMainIndicatorsChunk(monthArray),
          ciclosEFluxoDeCaixa: {},
        }
      ];
    }, []);

    return chunkedBsheets;
  }

  private deepDive = (object: any, props: Array<string>) =>
    props.reduce((innerObject: any, prop) => innerObject[prop], object)

  private getLastPositionIn = (monthArray: Array<BsheetPeriod>, group: string) => (...props: Array<string>) =>
    last(monthArray) ? this.deepDive(last(monthArray), [group, ...props]) : 0

  // gets last position in month array or, in case of a yearly chunk of the current year, the previous month position
  private getLastPositionWithConfigs = (monthArray: Array<BsheetPeriod>, configs: BsheetChunkingConfigObject, group: string) =>
    (...props: Array<string>) => configs.isYearlyAndCurrentYear && configs.previousMonth !== -1 ?
        this.deepDive(monthArray[configs.previousMonth], [group, ...props]) :
        this.getLastPositionIn(monthArray, group)(...props)


  private mapObjectFromArray = (func, prefixes, props) =>
    props.reduce(
      (builtObject, prop) =>
        ({...builtObject, [prop]: func(...prefixes, prop)}),
      {}
    )

  private processSummaryChunk(monthArray: Array<BsheetPeriod>, { januaryMonthArray }: BsheetChunkingConfigObject) {
    const getLastPositionInSummary = data => this.getLastPositionIn(data, 'resumo');
    const getCurrentPeriodLastPosition = getLastPositionInSummary(monthArray);

    const resultado = this.mapObjectFromArray(
      getCurrentPeriodLastPosition,
      ['resultado'],
      ['gastos', 'lucro', 'receita']
    );
    resultado.gastos = Math.abs(resultado.gastos);

    return {
      resultado,
      indiceDeRentabilidade: this.mapObjectFromArray(
        getCurrentPeriodLastPosition,
        ['indiceDeRentabilidade'],
        ['roe', 'roa']
      ),
      caixa: getCurrentPeriodLastPosition('caixa'),
      caixaAnterior: januaryMonthArray ? getLastPositionInSummary(januaryMonthArray)('caixa') : undefined,
      ncg: getCurrentPeriodLastPosition('ncg'),
      composicaoAtivoPassivo: {
        ativo: this.mapObjectFromArray(
          getCurrentPeriodLastPosition,
          ['composicaoAtivoPassivo', 'ativo'],
          ['caixaEEquivalente', 'contasAReceber', 'estoque', 'outrosCreditos']
        ),
        passivo: this.mapObjectFromArray(
          getCurrentPeriodLastPosition,
          ['composicaoAtivoPassivo', 'passivo'],
          ['emprestimosEFinanciamentos', 'fornecedorEContas', 'obrigacoesTrabalhistasEFiscais', 'outrasContas']
        ),
      },
    };
  }

  private processRevenueEvolutionChunk(monthArray: Array<BsheetPeriod>, configs: BsheetChunkingConfigObject) {
    const receitaAcumulada = this.getLastPositionWithConfigs(monthArray, configs, 'evolucaoReceita')('receita');
    return {
      receita: !configs.isFirstPeriod ?
        (receitaAcumulada - this.getLastPositionWithConfigs(configs.previousMonthArray, configs, 'evolucaoReceita')('receita')) :
         receitaAcumulada,
    };
  }

  private processCostsEvolutionChunk(monthArray: Array<BsheetPeriod>, configs: BsheetChunkingConfigObject) {
    const getLastPositionInCostsEvolution = data => this.getLastPositionWithConfigs(data, configs, 'evolucaoDespesas');

    const getAbsoluteLastPosition = data => (...props) => Math.abs(getLastPositionInCostsEvolution(data)(...props));
    const acumulados = {
      custos: getAbsoluteLastPosition(monthArray)('custos'),
      despesas: this.mapObjectFromArray(
        getAbsoluteLastPosition(monthArray),
        ['despesas'],
        ['operacionais', 'tributos', 'financeiras']
      ),
    };

    const getPeriodValue = (...props) => !configs.isFirstPeriod ?
      this.deepDive(acumulados, props) - getAbsoluteLastPosition(configs.previousMonthArray)(...props) :
      this.deepDive(acumulados, props);

    return {
      custos: getPeriodValue('custos'),
      despesas: this.mapObjectFromArray(
        getPeriodValue,
        ['despesas'],
        ['operacionais', 'tributos', 'financeiras']
      ),
    };
  }

  private processExpensesCompositionChunk(monthArray: Array<BsheetPeriod>, configs: BsheetChunkingConfigObject) {
    const getLastPositionInExpensesComposition = data => this.getLastPositionWithConfigs(data, configs, 'composicaoDespesas');

    const getAbsoluteLastPosition = data => (...props) => Math.abs(getLastPositionInExpensesComposition(data)(...props));
    const acumulados = this.mapObjectFromArray(
      getAbsoluteLastPosition(monthArray),
      [],
      [ 'marketingVendas', 'financeirasEJuros' ]
    );

    const deepFields = [
      [
        'folhaDePagamento',
        'total', 'proLaboreSalarios', 'beneficiosEmpregados', 'encargosSobreSalarios', 'provisoesDeSalarios'
      ],
      [
        'administrativaEOutros',
        'total', 'administrativas', 'depreciacaoDespesas', 'servicosPrestados', 'outrasDespesas', 'naoOperacional'
      ],
      [
        'impostos',
        'total', 'taxasContribuicoes', 'tributosSobreLucro', 'abatimentosDevolucoes', 'impostosSobreReceita'
      ]
    ];
    const mapToDeepFields = (obj, mapper) =>
      deepFields.forEach(
        ([label, ...props]) =>
         obj[label] = this.mapObjectFromArray(mapper, [label], props)
      );

    mapToDeepFields(acumulados, getAbsoluteLastPosition(monthArray));

    const getPeriodValue = (...props) => {
      const accumulatedValue = this.deepDive(acumulados, props);

      return !configs.isFirstPeriod ?
        accumulatedValue - getAbsoluteLastPosition(configs.previousMonthArray)(...props) :
        accumulatedValue;
    };

    const result = this.mapObjectFromArray(
      getPeriodValue,
      [],
      [ 'marketingVendas', 'financeirasEJuros' ]
    );

    mapToDeepFields(result, getPeriodValue);

    return result;
  }

  private processResultChunk(monthArray: Array<BsheetPeriod>, configs: BsheetChunkingConfigObject) {
    const getLastPositionInResult = data => this.getLastPositionWithConfigs(data, configs, 'resultado');
    const getAbsoluteLastPosition = data => (...props) => Math.abs(getLastPositionInResult(data)(...props));

    const acumulados = this.mapObjectFromArray(
      getAbsoluteLastPosition(monthArray),
      [],
      ['receita', 'receitaLiquida', 'custo', 'despesa']
    );

    acumulados.lucro = getLastPositionInResult(monthArray)('lucro');

    const getPeriodValue = prop => !configs.isFirstPeriod ?
      acumulados[prop] - getAbsoluteLastPosition(configs.previousMonthArray)(prop) :
      acumulados[prop];

    const periodValues = this.mapObjectFromArray(
      getPeriodValue,
      [],
      ['receita', 'receitaLiquida', 'custo', 'despesa']
    );

    periodValues.lucro = !configs.isFirstPeriod ?
      acumulados.lucro - getLastPositionInResult(configs.previousMonthArray)('lucro') :
      acumulados.lucro;

    periodValues.margemBruta = periodValues.receitaLiquida !== 0 ?
      ((periodValues.receitaLiquida - periodValues.custo) / periodValues.receitaLiquida) * 100 : 0;
    periodValues.margemLiquida = periodValues.receitaLiquida !== 0 ?
      (periodValues.lucro / periodValues.receitaLiquida) * 100 : 0;

    return periodValues;
  }

  private processSimpleTreasuryChunk(monthArray: Array<BsheetPeriod>, configs: BsheetChunkingConfigObject) {
    const { isYearly, previousMonthArray, previousYearMonthArray } = configs;

    const getLastPositionInTreasury = data => this.getLastPositionIn(data, 'tesourariaSimples');

    const caixaAnterior = isYearly ?
      (previousYearMonthArray ? getLastPositionInTreasury(previousYearMonthArray)('caixaAtual') : null) :
      (previousMonthArray ? getLastPositionInTreasury(previousMonthArray)('caixaAtual') : null);

    return {
      ...this.mapObjectFromArray(
        getLastPositionInTreasury(monthArray),
        [],
        ['caixaAtual', 'liquidezCorrente', 'liquidezSeca', 'liquidezImediata']
      ),
      caixaAnterior,
    };
  }

  private processAssetCompositionChunk(monthArray: Array<BsheetPeriod>) {
    const getLastPositionInAssetComposition = this.getLastPositionIn(monthArray, 'composicaoDoAtivo');
    const getAbsoluteLastPosition = (...props) => Math.abs(getLastPositionInAssetComposition(...props));

    return {
      circulante: this.mapObjectFromArray(
        getLastPositionInAssetComposition,
        ['circulante'],
        ['caixaEEquivalente', 'contasAReceber', 'estoque', 'outrosCreditos']
      ),
      naoCirculante: this.mapObjectFromArray(
        getAbsoluteLastPosition,
        ['naoCirculante'],
        ['longoPrazo', 'investimentos', 'imobilizado']
      ),
    };
  }

  private processPassiveCompositionChunk(monthArray: Array<BsheetPeriod>) {
    const getLastPositionInPassiveComposition = this.getLastPositionIn(monthArray, 'composicaoDoPassivo');
    const getAbsoluteLastPosition = (...props) => Math.abs(getLastPositionInPassiveComposition(...props));

    return {
      circulante: this.mapObjectFromArray(
        getLastPositionInPassiveComposition,
        ['circulante'],
        ['fornecedorEContas', 'emprestimosEFinanciamentos', 'obrigacoesTrabalhistasEFiscais', 'outrasContas']
      ),
      naoCirculante: this.mapObjectFromArray(
        getAbsoluteLastPosition,
        ['naoCirculante'],
        ['financiamentos', 'patrimonioLiquido', 'outrasContas']
      )
    };
  }

  private processMainIndicatorsChunk(monthArray: Array<BsheetPeriod>) {
    const getLastPositionInMainIndicators = this.getLastPositionIn(monthArray, 'indicadores');

    return {
      liquidez: this.mapObjectFromArray(
        getLastPositionInMainIndicators,
        ['liquidez'],
        ['geral', 'corrente', 'seca', 'imediata']
      ),
      estrutura: this.mapObjectFromArray(
        getLastPositionInMainIndicators,
        ['estrutura'],
        [
          'imobilizacaoDoPatrimonioLiquido',
          'participacaoCapitalDeTerceiros',
          'endividamentoBancario',
          'composicaoDaDivida',
          'capitalDeTerceiros',
          'garantiaDoCPaoCT',
          'composicaoDoCapital',
          'indiceDeSolvencia',
          'dividaLiquidaPL'
        ]
      ),
      rentabilidade: this.mapObjectFromArray(
        getLastPositionInMainIndicators,
        ['rentabilidade'],
        [
          'margemOperacionalBruta',
          'margemOperacionalLiquida',
          'margemLiquida',
          'giroDoAtivoOperacional',
          'retornoSobreAtivoOperacional',
          'rentabilidadeOperacional',
          'retornoSobrePatrimonioLiquido'
        ]
      ),
      necessidadeFinanceira: this.mapObjectFromArray(
        getLastPositionInMainIndicators,
        ['necessidadeFinanceira'],
        [
          'necessidadeLiquidaDeCapitalDeGiro',
          'tesouraria',
          'capitalCirculanteLiquido',
          'fluxoDeLongoPrazo',
          'capitalCirculanteProprio',
          'NLCDGROL'
        ]
      ),
      ciclo: this.mapObjectFromArray(
        getLastPositionInMainIndicators,
        ['ciclo'],
        ['contasAReceber', 'estoques', 'fornecedores', 'cicloOperacional', 'cicloFinanceiro']
      ),
      cobertura: this.mapObjectFromArray(
        getLastPositionInMainIndicators,
        ['cobertura'],
        ['indiceDeCoberturaDeJuros', 'dividaLiquidaEBITDA', 'EBITDA', 'EBITDAdividaBruta', 'EBITDAdividaLiquida']
      ),
      fluxoDeCaixa: this.mapObjectFromArray(
        getLastPositionInMainIndicators,
        ['fluxoDeCaixa'],
        ['fluxoDeCaixaOperacional', 'FCODividaBruta']
      ),
    };
  }
}
