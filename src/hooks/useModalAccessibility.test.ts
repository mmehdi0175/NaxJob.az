import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useModalAccessibility } from '@/hooks/useModalAccessibility';

function renderHookWithCallback(cb: () => void) {
  return renderHook(({ isOpen, onClose }) => useModalAccessibility(isOpen, onClose), {
    initialProps: { isOpen: false, onClose: cb },
  });
}

describe('useModalAccessibility', () => {
  it('returns a ref object', () => {
    const { result } = renderHookWithCallback(() => {});
    expect(result.current).toHaveProperty('current');
  });

  it('does not call onClose when Escape is pressed and modal is closed', () => {
    const onClose = vi.fn();
    const { rerender } = renderHookWithCallback(onClose);

    rerender({ isOpen: false, onClose });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed and modal is open', () => {
    const onClose = vi.fn();
    const { rerender } = renderHookWithCallback(onClose);

    rerender({ isOpen: true, onClose });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('locks body scroll when open and restores when closed', () => {
    const { rerender } = renderHookWithCallback(() => {});

    const originalOverflow = document.body.style.overflow;
    rerender({ isOpen: true, onClose: () => {} });
    expect(document.body.style.overflow).toBe('hidden');

    rerender({ isOpen: false, onClose: () => {} });
    expect(document.body.style.overflow).toBe(originalOverflow);
  });
});
