export function useCurrencyFormat() {
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    if (isNaN(value) || !isFinite(value)) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatCurrencyWithDecimal = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    if (isNaN(value) || !isFinite(value)) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatCompactCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    if (isNaN(value) || !isFinite(value)) return '-';
    
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    if (absValue >= 1000000) {
      return `${sign}Rp ${(absValue / 1000000).toFixed(1)}M`;
    }
    
    if (absValue >= 1000) {
      return `${sign}Rp ${(absValue / 1000).toFixed(0)}K`;
    }
    
    return `${sign}Rp ${absValue}`;
  };

  const parseCurrencyToNumber = (value: string | null | undefined): number => {
    if (!value) return 0;
    const cleaned = value.replace(/[^\d]/g, '');
    return parseInt(cleaned, 10) || 0;
  };

  return {
    formatCurrency,
    formatCurrencyWithDecimal,
    formatCompactCurrency,
    parseCurrencyToNumber
  };
}