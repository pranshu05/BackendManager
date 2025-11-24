import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button, buttonVariants } from '@/components/ui/button';

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
    const { variant = 'default', size = 'default', className } = props || {};
    const variantClass = config.variants.variant[variant] || '';
    const sizeClass = config.variants.size[size] || '';
    return `${base} ${variantClass} ${sizeClass} ${className || ''}`.trim();
  },
}));

describe('Button Component', () => {
  test('renders button element with data-slot and children', () => {
    render(
      <Button data-testid="button">
        Click me
      </Button>
    );

    const button = screen.getByTestId('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('data-slot', 'button');
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveTextContent('Click me');
  });
  test('buttonVariants returns strings for all variants and sizes', () => {
    const variants = ['default','destructive','outline','secondary','ghost','link'];
    const sizes = ['default','sm','lg','icon'];

    for (const v of variants) {
      expect(typeof buttonVariants({ variant: v })).toBe('string');
    }

    for (const s of sizes) {
      expect(typeof buttonVariants({ size: s })).toBe('string');
    }
  });

  test('passes through props to root element', () => {
    render(
      <Button id="my-btn" aria-label="action" data-testid="button">
        Custom
      </Button>
    );

    const button = screen.getByTestId('button');
    expect(button).toHaveAttribute('id', 'my-btn');
    expect(button).toHaveAttribute('aria-label', 'action');
  });

  test('renders button with asChild={true} as div using Slot', () => {
    render(
      <Button asChild={true} data-testid="button">
        <div className="custom-div">Slotted Button</div>
      </Button>
    );

    const button = screen.getByTestId('button');
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe('DIV');
    expect(button).toHaveTextContent('Slotted Button');
  });

  test('renders button with asChild={false} (default) as button element', () => {
    render(
      <Button asChild={false} data-testid="button">
        Normal Button
      </Button>
    );

    const button = screen.getByTestId('button');
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveTextContent('Normal Button');
  });

  test('renders button with variant + size combinations (smoke test)', () => {
    render(
      <Button variant="secondary" size="lg" data-testid="button">
        Combined
      </Button>
    );

    const button = screen.getByTestId('button');
    expect(button).toBeInTheDocument();
  });
});
