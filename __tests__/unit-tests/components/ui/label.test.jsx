import React from 'react';
import { render, screen } from '@testing-library/react';

import { Label } from '@/components/ui/label';

describe('Label (minimal)', () => {
  test('renders children, forwards htmlFor and merges className', () => {
    render(
      <Label htmlFor="some" className="custom-class" data-testid="l">
        My label
      </Label>
    );

    const el = screen.getByTestId('l');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('for', 'some');
    expect(el).toHaveTextContent('My label');
    // cn merges classes; ensure our custom class appears
    expect(el.className).toEqual(expect.stringContaining('custom-class'));
  });

  test('forwards ref to the label element and has displayName', () => {
    const ref = React.createRef();
    render(<Label ref={ref} data-testid="r">Ref label</Label>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current.tagName).toBe('LABEL');
    // ensure displayName is set
    expect(Label.displayName).toBe('Label');
  });
});
