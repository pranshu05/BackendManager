import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dropdown from '@/components/ui/dropdown';

// Mock ChevronDown from lucide-react
jest.mock('lucide-react', () => ({
  ChevronDown: (props) => <svg data-testid="chev" {...props} />,
}));

describe('Dropdown component (minimal)', () => {
  test('renders placeholder when no selection and no items', () => {
    render(<Dropdown />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Select an option');
    // Icon renders
    expect(screen.getByTestId('chev')).toBeInTheDocument();
  });

  test('opens menu, shows items, clicking item calls onSelect and closes', async () => {
    const items = ['One', 'Two'];
    const onSelect = jest.fn();
    const user = userEvent.setup();

    render(<Dropdown items={items} selected={"Two"} onSelect={onSelect} />);

    const button = screen.getByRole('button');
    await user.click(button);

    // Both items should appear in the list (note: selected text appears in the trigger too)
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getAllByText('Two').length).toBeGreaterThanOrEqual(1);

    // Click an item -> onSelect called and menu closes
    await user.click(screen.getByText('One'));
    expect(onSelect).toHaveBeenCalledWith('One');
    expect(screen.queryByText('One')).not.toBeInTheDocument();
  });

  test('clicking outside closes an open dropdown', async () => {
    const items = ['A'];
    const user = userEvent.setup();

    render(<Dropdown items={items} />);
    const button = screen.getByRole('button');

    // Open dropdown
    await user.click(button);
    expect(screen.getByText('A')).toBeInTheDocument();

    // Click on document body (outside) -> menu should close
    fireEvent.mouseDown(document.body);

    expect(screen.queryByText('A')).not.toBeInTheDocument();
  });
});
