import { describe, it, expect } from 'vitest';
import { cn } from './utils.js';

describe('Design System Utilities', () => {
  it('cn should merge class names and remove conflicts correctly', () => {
    const result = cn('px-2 py-1', 'px-4', { 'bg-red-500': true, 'bg-blue-500': false });
    expect(result).toBe('py-1 px-4 bg-red-500');
  });
});
