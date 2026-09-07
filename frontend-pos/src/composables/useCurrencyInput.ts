import { computed } from 'vue';

export function useCurrencyInput(
  getValue: () => number | null | undefined,
  setValue: (val: number) => void
) {
  return computed({
    get: () => {
      const val = getValue();
      if (!val) return '';
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },
    set: (val: string) => {
      const numericString = val.replace(/\D/g, '');
      setValue(numericString ? parseInt(numericString, 10) : 0);
    }
  });
}