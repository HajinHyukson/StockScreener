export * from '../executor';
if (f.kind === 'priceChangePctNDays') {
  rows = rows.filter(r => {
    const val = typeof r.priceChangePct === 'number' ? r.priceChangePct : NaN;
    return f.op === 'gte'
      ? val >= f.pct
      : val <= f.pct;
  });
}
