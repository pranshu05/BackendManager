import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge, badgeVariants } from '@/components/ui/badge';

// Mock the cn utility function
jest.mock('@/components/ui/utils.js', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}));

// Mock Slot from radix-ui
jest.mock('@radix-ui/react-slot', () => ({
  Slot: ({ children, ...props }) => <div {...props}>{children}</div>,
}));

// Mock class-variance-authority
jest.mock('class-variance-authority', () => ({
  cva: (base, config) => (props) => {
    const { variant = 'default' } = props || {};
    const variantClass = config.variants.variant[variant] || '';
    return `${base} ${variantClass}`;
  },
}));

describe('Badge Component', () => {
  test('renders badge as span with data-slot and children', () => {
    render(
      <Badge data-testid="badge">
        Default Badge
      </Badge>
    );

    const badge = screen.getByTestId('badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-slot', 'badge');
    expect(badge.tagName).toBe('SPAN');
    expect(badge).toHaveTextContent('Default Badge');
  });

  test('badgeVariants returns expected outputs for all variants', () => {
    // call badgeVariants for each known variant to exercise the code paths
    const vDefault = badgeVariants({ variant: 'default' });
    const vSecondary = badgeVariants({ variant: 'secondary' });
    const vDestructive = badgeVariants({ variant: 'destructive' });
    const vOutline = badgeVariants({ variant: 'outline' });

    expect(typeof vDefault).toBe('string');
    expect(typeof vSecondary).toBe('string');
    expect(typeof vDestructive).toBe('string');
    expect(typeof vOutline).toBe('string');
  });

  test('passes through props to root element', () => {
    render(
      <Badge id="my-badge" aria-label="test" data-testid="badge">
        Content
      </Badge>
    );

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveAttribute('id', 'my-badge');
    expect(badge).toHaveAttribute('aria-label', 'test');
  });

  test('renders badge with asChild={true} as div using Slot', () => {
    render(
      <Badge asChild={true} data-testid="badge">
        <div className="child-div">Slotted Content</div>
      </Badge>
    );

    const badge = screen.getByTestId('badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Slotted Content');
  });

  test('renders badge with asChild={false} (default) as span', () => {
    render(
      <Badge asChild={false} data-testid="badge">
        Default Span
      </Badge>
    );

    const badge = screen.getByTestId('badge');
    expect(badge.tagName).toBe('SPAN');
    expect(badge).toHaveTextContent('Default Span');
  });
});
