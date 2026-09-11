import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useRef } from 'react';
import { usePointerHeld } from './use-pointer-held';

function setupTarget() {
  const container = document.createElement('div');
  const inside = document.createElement('button');
  const outside = document.createElement('button');
  container.appendChild(inside);
  document.body.appendChild(container);
  document.body.appendChild(outside);
  return { container, inside, outside };
}

function pointerEvent(type: string, pointerId: number): PointerEvent {
  return new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId });
}

describe('usePointerHeld', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('is true while a pointer pressed inside is held', () => {
    const { inside } = setupTarget();
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(null);
      ref.current ??= inside.parentElement as HTMLDivElement;
      return usePointerHeld(ref);
    });
    expect(result.current).toBe(false);
    act(() => {
      inside.dispatchEvent(pointerEvent('pointerdown', 1));
    });
    expect(result.current).toBe(true);
    act(() => {
      window.dispatchEvent(pointerEvent('pointerup', 1));
    });
    expect(result.current).toBe(false);
  });

  it('ignores presses that start outside the target', () => {
    const { container, outside } = setupTarget();
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(container);
      return usePointerHeld(ref);
    });
    act(() => {
      outside.dispatchEvent(pointerEvent('pointerdown', 2));
    });
    expect(result.current).toBe(false);
  });

  it('stays held until every pointer is released', () => {
    const { inside } = setupTarget();
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(inside.parentElement as HTMLDivElement);
      return usePointerHeld(ref);
    });
    act(() => {
      inside.dispatchEvent(pointerEvent('pointerdown', 1));
    });
    act(() => {
      inside.dispatchEvent(pointerEvent('pointerdown', 2));
    });
    act(() => {
      window.dispatchEvent(pointerEvent('pointerup', 1));
    });
    expect(result.current).toBe(true);
    act(() => {
      window.dispatchEvent(pointerEvent('pointerup', 2));
    });
    expect(result.current).toBe(false);
  });

  it('releases on pointercancel or window blur', () => {
    const { inside } = setupTarget();
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(inside.parentElement as HTMLDivElement);
      return usePointerHeld(ref);
    });
    act(() => {
      inside.dispatchEvent(pointerEvent('pointerdown', 3));
    });
    expect(result.current).toBe(true);
    act(() => {
      window.dispatchEvent(pointerEvent('pointercancel', 3));
    });
    expect(result.current).toBe(false);
    act(() => {
      inside.dispatchEvent(pointerEvent('pointerdown', 4));
    });
    expect(result.current).toBe(true);
    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    expect(result.current).toBe(false);
  });

  it('detects presses even when the child stops propagation', () => {
    const { inside } = setupTarget();
    inside.addEventListener('pointerdown', (event) => event.stopPropagation());
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(inside.parentElement as HTMLDivElement);
      return usePointerHeld(ref);
    });
    act(() => {
      inside.dispatchEvent(pointerEvent('pointerdown', 5));
    });
    expect(result.current).toBe(true);
  });

  it('detects presses retargeted by an open shadow root', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const player = document.createElement('div');
    const thumb = document.createElement('button');
    player.appendChild(thumb);
    shadow.appendChild(player);
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(player);
      return usePointerHeld(ref);
    });
    act(() => {
      thumb.dispatchEvent(pointerEvent('pointerdown', 6));
    });
    expect(result.current).toBe(true);
    act(() => {
      window.dispatchEvent(pointerEvent('pointerup', 6));
    });
    expect(result.current).toBe(false);
  });
});
