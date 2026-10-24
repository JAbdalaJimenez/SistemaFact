import { useState, useEffect } from "react";

/**
 * Hook de debounce para optimizar cálculos en tiempo real y búsquedas en UI institucional
 * @param value Valor a debouncificar
 * @param delay Tiempo de retardo en ms (por defecto 300ms)
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
