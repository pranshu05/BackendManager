import React from 'react'
import { DialogTrigger } from '../dialog';
import { fireEvent, render, screen } from '@testing-library/react';
import "@testing-library/jest-dom";

// Mock the cn function from utils.js
jest.mock("../utils.js", () => {
  const originalModule = jest.requireActual("../utils.js");
  return {
    __esModule: true,
    ...originalModule,
    cn: jest.fn(),
  };
});

// Mock the DialogPrimitive components
jest.mock("@radix-ui/react-dialog", () => {
  const originalModule = jest.requireActual("@radix-ui/react-dialog");
  return {
    __esModule: true,
    ...originalModule,
    Trigger: (props) => <button {...props} />,
  };
});

// Mock the XIcon component
jest.mock("lucide-react", () => {
  const originalModule = jest.requireActual("lucide-react");
  return {
    __esModule: true,
    ...originalModule,
    XIcon: () => <svg />,
  };
});

describe('DialogTrigger() DialogTrigger method', () => {
  describe('Happy Paths', () => {
    it('should render the DialogTrigger component correctly', () => {
      // Test to ensure the DialogTrigger renders correctly with default props
      render(<DialogTrigger>Open Dialog</DialogTrigger>);
      const triggerButton = screen.getByRole('button', { name: /open dialog/i });
      expect(triggerButton).toBeInTheDocument();
    });

    it('should pass props to the DialogPrimitive.Trigger component', () => {
      // Test to ensure props are passed correctly to the DialogPrimitive.Trigger
      render(<DialogTrigger data-testid="dialog-trigger">Open Dialog</DialogTrigger>);
      const triggerButton = screen.getByTestId('dialog-trigger');
      expect(triggerButton).toBeInTheDocument();
      expect(triggerButton).toHaveTextContent('Open Dialog');
    });
  });

  describe('Edge Cases', () => {
    it('should handle click events correctly', () => {
      // Test to ensure click events are handled correctly
      const handleClick = jest.fn();
      render(<DialogTrigger onClick={handleClick}>Open Dialog</DialogTrigger>);
      const triggerButton = screen.getByRole('button', { name: /open dialog/i });
      fireEvent.click(triggerButton);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle missing children gracefully', () => {
      // Test to ensure the component handles missing children gracefully
      render(<DialogTrigger />);
      const triggerButton = screen.getByRole('button');
      expect(triggerButton).toBeInTheDocument();
      expect(triggerButton).toBeEmptyDOMElement();
    });
  });
});