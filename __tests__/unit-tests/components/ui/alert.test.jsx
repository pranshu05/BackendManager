import React from 'react';
import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// Mock the cn utility function
jest.mock('@/components/ui/utils.js', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}));

// Mock class-variance-authority
jest.mock('class-variance-authority', () => ({
  cva: (base, config) => (props) => {
    const { variant = 'default' } = props || {};
    const variantClass = config.variants.variant[variant] || '';
    return `${base} ${variantClass}`;
  },
}));

describe('Alert Components', () => {
  test('renders alert with default variant, role, data-slot, and custom props', () => {
    render(
      <Alert className="custom-alert" id="alert-1" data-testid="alert">
        Alert content
      </Alert>
    );
    
    const alert = screen.getByTestId('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveAttribute('data-slot', 'alert');
    expect(alert).toHaveClass('custom-alert');
    expect(alert).toHaveAttribute('id', 'alert-1');
  });

  test('renders alert with destructive variant', () => {
    render(
      <Alert variant="destructive" data-testid="alert">
        Error message
      </Alert>
    );
    
    const alert = screen.getByTestId('alert');
    expect(alert).toBeInTheDocument();
  });

  test('renders AlertTitle with data-slot and custom props', () => {
    render(
      <AlertTitle className="custom-title" id="my-title" data-testid="title">
        Title text
      </AlertTitle>
    );
    
    const title = screen.getByTestId('title');
    expect(title).toBeInTheDocument();
    expect(title).toHaveAttribute('data-slot', 'alert-title');
    expect(title).toHaveClass('custom-title');
    expect(title).toHaveAttribute('id', 'my-title');
  });

  test('renders AlertDescription with data-slot and custom props', () => {
    render(
      <AlertDescription className="custom-desc" id="my-desc" data-testid="desc">
        Description text
      </AlertDescription>
    );
    
    const desc = screen.getByTestId('desc');
    expect(desc).toBeInTheDocument();
    expect(desc).toHaveAttribute('data-slot', 'alert-description');
    expect(desc).toHaveClass('custom-desc');
    expect(desc).toHaveAttribute('id', 'my-desc');
  });

  test('renders complete alert structure with all components and destructive variant', () => {
    render(
      <Alert variant="destructive" data-testid="alert">
        <AlertTitle data-testid="title">Error</AlertTitle>
        <AlertDescription data-testid="desc">
          An error occurred.
        </AlertDescription>
      </Alert>
    );
    
    expect(screen.getByTestId('alert')).toBeInTheDocument();
    expect(screen.getByTestId('title')).toBeInTheDocument();
    expect(screen.getByTestId('desc')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('An error occurred.')).toBeInTheDocument();
  });
});
