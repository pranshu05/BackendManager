import React from 'react';
import { render, screen } from '@testing-library/react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

describe('Select (minimal)', () => {
  test('renders select with item children, forwards attributes and supports disabled', () => {
    render(
      <Select data-testid="sel" className="custom-sel" aria-label="sel">
        <SelectItem data-testid="i1" value="1">One</SelectItem>
        <SelectItem data-testid="i2" value="2" disabled>Two</SelectItem>
      </Select>
    );

    const sel = screen.getByTestId('sel');
    expect(sel).toBeInTheDocument();
    expect(sel).toHaveAttribute('aria-label', 'sel');
    expect(sel.className).toEqual(expect.stringContaining('custom-sel'));

    const one = screen.getByTestId('i1');
    const two = screen.getByTestId('i2');
    expect(one).toBeInTheDocument();
    expect(one).toHaveAttribute('value', '1');
    expect(two).toBeInTheDocument();
    expect(two).toBeDisabled();
  });

  test('forwards refs and exposes displayName for all subcomponents', () => {
    const sref = React.createRef();
    const cref = React.createRef();
    const iref = React.createRef();
    const tref = React.createRef();
    const vref = React.createRef();

    render(
      <div>
        <Select ref={sref} data-testid="sel2">
          <SelectItem ref={iref} data-testid="item2">X</SelectItem>
        </Select>
        <SelectContent ref={cref} data-testid="content2">C</SelectContent>
        <SelectTrigger ref={tref} data-testid="trig2">T</SelectTrigger>
        <SelectValue ref={vref} data-testid="val2">V</SelectValue>
      </div>
    );

    expect(sref.current).toBeInstanceOf(HTMLElement);
    expect(iref.current).toBeInstanceOf(HTMLElement);
    expect(cref.current).toBeInstanceOf(HTMLElement);
    expect(tref.current).toBeInstanceOf(HTMLElement);
    expect(vref.current).toBeInstanceOf(HTMLElement);

    // ensure displayName strings are present for each component
    expect(Select.displayName).toBe('Select');
    expect(SelectContent.displayName).toBe('SelectContent');
    expect(SelectItem.displayName).toBe('SelectItem');
    expect(SelectTrigger.displayName).toBe('SelectTrigger');
    expect(SelectValue.displayName).toBe('SelectValue');
  });
});
