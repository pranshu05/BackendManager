import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock cn to produce a deterministic class string for assertions
jest.mock('@/components/ui/utils.js', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}));

// Mock Radix Tabs primitives so tests don't depend on the real library
jest.mock('@radix-ui/react-tabs', () => {
  const React = require('react');
  return {
    Root: ({ children, ...props }) => <div data-slot="tabs" {...props}>{children}</div>,
    List: ({ children, ...props }) => <div data-slot="tabs-list" {...props}>{children}</div>,
    Trigger: ({ children, ...props }) => <button data-slot="tabs-trigger" {...props}>{children}</button>,
    Content: ({ children, ...props }) => <div data-slot="tabs-content" {...props}>{children}</div>,
  };
});

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

describe('Tabs (minimal)', () => {
  test('renders all primitives with proper data-slot and merges className', () => {
    render(
      <Tabs data-testid="tabs" className="tclass">
        <TabsList data-testid="list" className="lclass">
          <TabsTrigger data-testid="trig" className="trclass">Tab</TabsTrigger>
        </TabsList>
        <TabsContent data-testid="content" className="cclass">C</TabsContent>
      </Tabs>
    );

    expect(screen.getByTestId('tabs')).toHaveAttribute('data-slot', 'tabs');
    expect(screen.getByTestId('tabs').className).toEqual(expect.stringContaining('tclass'));

    expect(screen.getByTestId('list')).toHaveAttribute('data-slot', 'tabs-list');
    expect(screen.getByTestId('list').className).toEqual(expect.stringContaining('lclass'));

    expect(screen.getByTestId('trig')).toHaveAttribute('data-slot', 'tabs-trigger');
    expect(screen.getByTestId('trig').className).toEqual(expect.stringContaining('trclass'));

    expect(screen.getByTestId('content')).toHaveAttribute('data-slot', 'tabs-content');
    expect(screen.getByTestId('content').className).toEqual(expect.stringContaining('cclass'));
  });

  test('forwards refs for each component', () => {
    const rRef = React.createRef();
    const lRef = React.createRef();
    const tRef = React.createRef();
    const cRef = React.createRef();

    render(
      <div>
        <Tabs ref={rRef}><div /></Tabs>
        <TabsList ref={lRef} /><TabsTrigger ref={tRef} /><TabsContent ref={cRef} />
      </div>
    );

    expect(rRef.current).toBeInstanceOf(HTMLElement);
    expect(lRef.current).toBeInstanceOf(HTMLElement);
    expect(tRef.current).toBeInstanceOf(HTMLElement);
    expect(cRef.current).toBeInstanceOf(HTMLElement);
  });
});
