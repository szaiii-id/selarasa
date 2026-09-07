import { onMounted, onUnmounted } from 'vue';

interface PinKeyboardOptions {
  onDigit: (num: number) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
  isDisabled?: () => boolean;
}

export function usePinKeyboard(options: PinKeyboardOptions) {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (options.isDisabled && options.isDisabled()) return;

    if (event.key >= '0' && event.key <= '9') {
      options.onDigit(parseInt(event.key, 10));
    } else if (event.key === 'Backspace') {
      options.onBackspace();
    } else if (event.key === 'Escape') {
      options.onClear();
    } else if (event.key === 'Enter') {
      options.onSubmit();
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });
}