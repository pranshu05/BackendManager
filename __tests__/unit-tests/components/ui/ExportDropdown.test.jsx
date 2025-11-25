import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportDropdown from '@/components/ui/ExportDropdown';

// Mock lucide-react icons used by ExportDropdown
jest.mock('lucide-react', () => ({
  ChevronDown: (props) => <svg data-testid="chev" {...props} />,
  Download: (props) => <svg data-testid="dl" {...props} />,
}));

describe('ExportDropdown (minimal tests)', () => {
  test('renders default label and icon', () => {
    render(<ExportDropdown options={[]} onSelect={() => {}} />);

    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('Export Data');
    expect(screen.getByTestId('chev')).toBeInTheDocument();
  });

  test('opens list and select option calls onSelect then closes and resets label', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const opts = ['CSV', 'JSON'];

    render(<ExportDropdown options={opts} onSelect={onSelect} />);

    const btn = screen.getByRole('button');
    await user.click(btn);

    // options visible
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();

    // choose first option
    await user.click(screen.getByText('CSV'));
    expect(onSelect).toHaveBeenCalledWith('CSV');

    // after selection menu should close and label should be reset to default
    expect(screen.queryByText('CSV')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('Export Data');
  });

  test('disabled and isLoading prevent opening', async () => {
    const user = userEvent.setup();
    const opts = ['A'];

    // disabled should render disabled button and clicking should not open menu
    render(<ExportDropdown options={opts} onSelect={() => {}} disabled={true} />);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(screen.queryByText('A')).not.toBeInTheDocument();

    // isLoading should also disable the button
    render(<ExportDropdown options={opts} onSelect={() => {}} isLoading={true} />);
    const btn2 = screen.getAllByRole('button')[1];
    expect(btn2).toBeDisabled();
    await user.click(btn2);
    expect(screen.queryByText('A')).not.toBeInTheDocument();
  });

  test('clicking outside closes the open menu', async () => {
    const user = userEvent.setup();
    const opts = ['A'];

    render(<ExportDropdown options={opts} onSelect={() => {}} />);
    const btn = screen.getByRole('button');
    await user.click(btn);
    expect(screen.getByText('A')).toBeInTheDocument();

    // clicking outside (document.body) should close
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('A')).not.toBeInTheDocument();
  });
});
