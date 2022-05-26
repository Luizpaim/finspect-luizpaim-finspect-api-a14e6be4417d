import Intl = require('intl');

export const formatNumber = (number: string|number, decimalPlaces = 2) => {
    const roundedNumber = Number(number) ? roundTo(Number(number), decimalPlaces) : 0;

    const formatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces });

    return formatter.format(roundedNumber);
};

export const roundTo = (num: number, decimalPlaces: number) => Math.round(num * +`1e+${decimalPlaces}`)  * +`1e-${decimalPlaces}` || 0;