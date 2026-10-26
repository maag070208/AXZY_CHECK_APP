/** Formato de moneda de la APP: $1,234.56 (siempre dos decimales). */
export const formatMoney = (value: number) => {
  const safe = Number.isFinite(value) ? value : 0;
  const absolute = Math.abs(safe).toFixed(2);
  const [integer, decimals] = absolute.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${safe < 0 ? '-' : ''}$${grouped}.${decimals}`;
};
