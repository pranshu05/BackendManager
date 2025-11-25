import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Mock the cn utility function
jest.mock('@/components/ui/utils.js', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}));

// Mock Slot from radix-ui
jest.mock('@radix-ui/react-slot', () => ({
  Slot: ({ children, ...props }) => <div {...props}>{children}</div>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  XIcon: (props) => <svg data-testid="x-icon" {...props} />,
}));

// Mock Radix UI Dialog
jest.mock('@radix-ui/react-dialog', () => {
  const React = require('react');
  return {
    Root: ({ children, ...props }) => <div data-slot="dialog" {...props}>{children}</div>,
    Trigger: ({ children, ...props }) => <button data-slot="dialog-trigger" {...props}>{children}</button>,
    Portal: ({ children, ...props }) => <div data-slot="dialog-portal" {...props}>{children}</div>,
    Close: ({ children, ...props }) => <button data-slot="dialog-close" {...props}>{children}</button>,
    Overlay: ({ children, className, ...props }) => (
      <div data-slot="dialog-overlay" className={className} {...props}>{children}</div>
    ),
    Content: ({ children, className, ...props }) => (
      <div data-slot="dialog-content" className={className} {...props}>{children}</div>
    ),
    Title: ({ children, ...props }) => (
      <h2 data-slot="dialog-title" {...props}>{children}</h2>
    ),
    Description: ({ children, ...props }) => (
      <p data-slot="dialog-description" {...props}>{children}</p>
    ),
    Title: ({ children, className, ...props }) => (
      <div data-slot="dialog-title" className={className} {...props}>{children}</div>
    ),
    Description: ({ children, className, ...props }) => (
      <div data-slot="dialog-description" className={className} {...props}>{children}</div>
    ),
  };
});

describe('Dialog Components', () => {
  test('basic dialog root + content + props + title/description + inner close', () => {
    render(
      <Dialog id="d1" data-testid="dialog">
        <DialogContent data-testid="content">
          <DialogTitle data-testid="title">T</DialogTitle>
          <DialogDescription data-testid="desc">D</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    const d = screen.getByTestId('dialog');
    expect(d).toBeInTheDocument();
    expect(d).toHaveAttribute('data-slot', 'dialog');
    expect(d).toHaveAttribute('id', 'd1');
    // title/description are rendered via DialogPrimitive.Title/Description
    expect(screen.getByTestId('title')).toBeInTheDocument();
    expect(screen.getByTestId('desc')).toBeInTheDocument();
    // DialogContent injects an internal Close which contains XIcon and "Close" label
    expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  test('trigger, portal and overlay close presence', () => {
    render(
      <Dialog>
        <DialogTrigger data-testid="trigger">Open</DialogTrigger>
        <DialogPortal data-testid="portal">
          <DialogOverlay data-testid="overlay">
            <DialogContent data-testid="content">C</DialogContent>
            <DialogClose data-testid="close">x</DialogClose>
          </DialogOverlay>
        </DialogPortal>
      </Dialog>
    );

    expect(screen.getByTestId('trigger')).toBeInTheDocument();
    expect(screen.getByTestId('portal')).toBeInTheDocument();
    expect(screen.getByTestId('overlay')).toBeInTheDocument();
    expect(screen.getByTestId('close')).toBeInTheDocument();
  });

  test('header/footer + composition', () => {
    render(
      <Dialog data-testid="dialog">
        <DialogContent data-testid="content">
          <DialogHeader data-testid="header">H</DialogHeader>
          <DialogFooter data-testid="footer">F</DialogFooter>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByTestId('header')).toHaveAttribute('data-slot', 'dialog-header');
    expect(screen.getByTestId('footer')).toHaveAttribute('data-slot', 'dialog-footer');
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
