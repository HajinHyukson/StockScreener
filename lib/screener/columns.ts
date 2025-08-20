export type Column = {
  key: string;
  label: string;
  align?: 'left' | 'right';
};


export function getDefaultColumns(): Column[] {
  return [
    { key: 'symbol', label: 'Symbol' },
    { key: 'companyName', label: 'Company' },
    { key: 'sector', label: 'Sector' },
    { key: 'priceDaily', label: 'Price (Daily %)', align: 'right' },
  ];
}


export function getFilterColumns(activeFundIds: string[], activeTechIds: string[], hasNDays: boolean): Column[] {
  const cols: Column[] = [];
  if (activeFundIds.includes('base.marketCap')) cols.push({ key: 'marketCap', label: 'Market Cap', align: 'right' });
  if (activeFundIds.includes('fa.per'))        cols.push({ key: 'per',       label: 'PER',        align: 'right' });
  if (activeTechIds.includes('ti.rsi'))        cols.push({ key: 'rsi',       label: 'RSI',        align: 'right' });
  if (hasNDays)                                 cols.push({ key: 'nDays',     label: 'Price Δ',    align: 'right' });
  // Explain at the end
  cols.push({ key: 'explain', label: 'Explain' });
  return cols;
}
