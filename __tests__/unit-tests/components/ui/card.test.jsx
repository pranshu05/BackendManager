import React from 'react';
import { render, screen } from '@testing-library/react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardAction,
  CardContent, 
  CardFooter 
} from '@/components/ui/card';

// Mock the cn utility function
jest.mock('@/components/ui/utils.js', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}));

describe('Card Components', () => {
  test('card root renders and passes props', () => {
    render(<Card data-testid="card" id="c-1">Root</Card>);

    const card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute('data-slot', 'card');
    expect(card).toHaveAttribute('id', 'c-1');
    expect(card).toHaveTextContent('Root');
  });

  test('subcomponents render with data-slot and correct element types', () => {
    render(
      <>
        <CardHeader data-testid="header">Header</CardHeader>
        <CardTitle data-testid="title">Title</CardTitle>
        <CardDescription data-testid="desc">Desc</CardDescription>
        <CardAction data-testid="action">Action</CardAction>
        <CardContent data-testid="content">Content</CardContent>
        <CardFooter data-testid="footer">Footer</CardFooter>
      </>
    );

    expect(screen.getByTestId('header')).toHaveAttribute('data-slot', 'card-header');
    expect(screen.getByTestId('title').tagName).toBe('H4');
    expect(screen.getByTestId('desc').tagName).toBe('P');
    expect(screen.getByTestId('action')).toHaveAttribute('data-slot', 'card-action');
    expect(screen.getByTestId('content')).toHaveAttribute('data-slot', 'card-content');
    expect(screen.getByTestId('footer')).toHaveAttribute('data-slot', 'card-footer');
  });

  test('complete card composition and props passthrough', () => {
    render(
      <Card data-testid="card-full" id="card-1" aria-label="test-card">
        <CardHeader data-testid="header">
          <CardTitle data-testid="title">Card Title</CardTitle>
          <CardDescription data-testid="desc">Card description</CardDescription>
        </CardHeader>
        <CardContent data-testid="content">Main content</CardContent>
        <CardFooter data-testid="footer">Footer</CardFooter>
      </Card>
    );

    const root = screen.getByTestId('card-full');
    expect(root).toHaveAttribute('id', 'card-1');
    expect(root).toHaveAttribute('aria-label', 'test-card');
    expect(screen.getByTestId('title')).toHaveTextContent('Card Title');
  });
});
