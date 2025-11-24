import React from 'react';
import { render, screen } from '@testing-library/react';

import { Textarea } from '@/components/ui/textarea';

describe('Textarea (minimal)', () => {
  test('renders textarea and forwards props', () => {
    render(<Textarea data-testid="ta" placeholder="enter" />);
    const el = screen.getByTestId('ta');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('placeholder', 'enter');
    expect(el).toHaveAttribute('data-slot', 'textarea');
  });

  test('merges className and forwards ref', () => {
    const ref = React.createRef();
    render(<Textarea ref={ref} className="custom-ta" data-testid="ta2" />);
    const el = screen.getByTestId('ta2');
    expect(el.className).toEqual(expect.stringContaining('custom-ta'));
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current.tagName).toBe('TEXTAREA');
  });
});
