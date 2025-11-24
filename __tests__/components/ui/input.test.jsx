import React from 'react';
import { render, screen } from '@testing-library/react';

import { Input } from '@/components/ui/input';

describe('Input (minimal)', () => {
  test('renders with props and forwards attributes', () => {
    render(<Input type="text" placeholder="enter" data-testid="i" />);
    const el = screen.getByTestId('i');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('type', 'text');
    expect(el).toHaveAttribute('placeholder', 'enter');
    expect(el).toHaveAttribute('data-slot', 'input');
  });

  test('includes custom className when provided', () => {
    render(<Input className="my-custom" data-testid="c" />);
    const el = screen.getByTestId('c');
    // cn will merge classes; ensure the custom class makes it into the final className
    expect(el.className).toEqual(expect.stringContaining('my-custom'));
  });
});
