export const codeToLevel = (code: string) => {
  const sections = code.trim().split('.').map(Number);
  return sections.reduce((previousValue: number, currValue: number, currIndex: number) => {
    return currValue > 0 ? currIndex + 1 : previousValue;
  }, 0);
};

export const ptbrStringToNumber = (value: string) => parseFloat(value.trim().replace(/[.()]/g, '').replace(',', '.'));