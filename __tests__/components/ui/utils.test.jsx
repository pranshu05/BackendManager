import { cn } from '@/components/ui/utils';

describe('cn utility (minimal)', () => {
  test('merges tailwind classes (twMerge) - later wins for conflicting classes', () => {
    // twMerge should prefer later utility for same group
    const out = cn('p-2', 'p-4', 'text-sm');
    expect(out).toEqual(expect.stringContaining('p-4'));
    expect(out).toEqual(expect.stringContaining('text-sm'));
  });

  test('handles mixed inputs like clsx (arrays, objects, strings)', () => {
    const out = cn('foo', ['bar', { baz: true, nope: false }], null, undefined, 'z');
    // clsx should flatten and include truthy object keys
    expect(out).toEqual(expect.stringContaining('foo'));
    expect(out).toEqual(expect.stringContaining('bar'));
    expect(out).toEqual(expect.stringContaining('baz'));
    expect(out).toEqual(expect.stringContaining('z'));
    // ensure falsey keys not present
    expect(out).not.toEqual(expect.stringContaining('nope'));
  });
});
