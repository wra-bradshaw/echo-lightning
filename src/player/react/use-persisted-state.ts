import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DependencyList,
  type EffectCallback,
  type SetStateAction,
} from 'react';

function usePassiveEffect(effect: EffectCallback, dependencies: DependencyList): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional reusable abstraction over useEffect that forwards dynamic deps; callers provide correct deps
  useEffect(() => effect(), dependencies);
}

function useLatestRef<T>(value: T): { current: T } {
  const valueRef = useRef(value);
  usePassiveEffect(() => {
    valueRef.current = value;
  }, [value]);
  return valueRef;
}

type PersistedSetter<T> = (value: T | ((current: T) => T)) => void;

export function usePersistedState<T>(
  saved: T | undefined,
  defaultValue: T,
  clamp: (value: T) => T,
  onChange?: (value: T) => void,
): readonly [T, PersistedSetter<T>] {
  const [value, setValueState] = useState<T>(saved ?? defaultValue);
  const onChangeRef = useLatestRef(onChange);
  const hasHydrated = useRef(false);

  usePassiveEffect(() => {
    setValueState(saved ?? defaultValue);
    hasHydrated.current = false;
  }, [saved, defaultValue]);

  usePassiveEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      return;
    }
    onChangeRef.current?.(value);
  }, [value, onChangeRef]);

  const setValue = useCallback(
    (nextValue: SetStateAction<T>) => {
      setValueState((current) => {
        const resolved = typeof nextValue === 'function' ? (nextValue as (current: T) => T)(current) : nextValue;
        return clamp(resolved);
      });
    },
    [clamp],
  );

  return [value, setValue] as const;
}
