export interface BsheetPeriod extends Object {
    date: string;
    resumo: any;
    evolucaoReceita: any;
    evolucaoDespesas: any;
    composicaoDespesas: any;
    resultado: any;
    tesourariaSimples: any;
    composicaoDoAtivo: any;
    composicaoDoPassivo: any;
    indicadores: any;
    ciclosEFluxoDeCaixa: any;
}

export interface BsheetChunkingConfigObject extends Object {
    previousMonthArray: Array<BsheetPeriod>;
    previousYearMonthArray: Array<BsheetPeriod>;
    januaryMonthArray: Array<BsheetPeriod>;
    isFirstPeriod: boolean;
    isYearly: boolean;
    isYearlyAndCurrentYear: boolean;
    previousMonth: number;
}

export interface BsheetChunk extends Object {
    chunkSize: number;
    data: Array<BsheetPeriod>;
}