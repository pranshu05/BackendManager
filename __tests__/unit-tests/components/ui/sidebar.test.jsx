import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// mock lucide-react icons used by the component
jest.mock('lucide-react', () => ({
  Menu: (p) => <svg data-testid="icon-menu" {...p} />,
  Table: (p) => <svg data-testid="icon-table" {...p} />,
  MessageSquare: (p) => <svg data-testid="icon-msg" {...p} />,
  Zap: (p) => <svg data-testid="icon-zap" {...p} />,
  History: (p) => <svg data-testid="icon-history" {...p} />,
  LayoutDashboard: (p) => <svg data-testid="icon-layout" {...p} />,
}));

import Sidebar from '@/components/ui/sidebar';

describe('Sidebar (minimal)', () => {
  test('renders items, highlights active and calls onSelectPage when an item is clicked', async () => {
    const onSelectPage = jest.fn();
    render(<Sidebar active="table" onSelectPage={onSelectPage} />);

    // active item gets the active css class
    const tableLabel = screen.getByText('Table Explorer');
    expect(tableLabel).toBeInTheDocument();
    expect(tableLabel.parentElement.className).toEqual(expect.stringContaining('bg-gray-100'));

    // click another items and ensure callback receives the expected page ids
    const user = userEvent.setup();
    await user.click(screen.getByText('Optimization'));
    await user.click(screen.getByText('Table Explorer'));
    await user.click(screen.getByText('Query'));
    await user.click(screen.getByText('Query History'));
    await user.click(screen.getByText('View Schema'));
    expect(onSelectPage).toHaveBeenCalledWith('optimization');
    expect(onSelectPage).toHaveBeenCalledWith('table');
    expect(onSelectPage).toHaveBeenCalledWith('query');
    expect(onSelectPage).toHaveBeenCalledWith('history');
    expect(onSelectPage).toHaveBeenCalledWith('schema');
  });

  test('each active value highlights the correct item (covers branch true for each ternary)', () => {
    const onSelectPage = jest.fn();
    const { rerender } = render(<Sidebar active="table" onSelectPage={onSelectPage} />);
    const pages = ['table', 'query', 'optimization', 'history', 'schema'];
    pages.forEach((p) => {
      rerender(<Sidebar active={p} onSelectPage={onSelectPage} />);
      // each active page should have its item's span parent contain the active class
      const labelMap = {
        table: 'Table Explorer',
        query: 'Query',
        optimization: 'Optimization',
        history: 'Query History',
        schema: 'View Schema',
      };
      const lbl = screen.getByText(labelMap[p]);
      expect(lbl.parentElement.className).toEqual(expect.stringContaining('bg-gray-100'));
    });
  });

  test('toggles collapse state and hides labels when collapsed', async () => {
    const onSelectPage = jest.fn();
    const { container } = render(<Sidebar active="table" onSelectPage={onSelectPage} />);

    // initially the sidebar should show the wide class
    expect(container.firstChild.className).toEqual(expect.stringContaining('w-40'));

    // toggle the sidebar using the button (Menu)
    const user = userEvent.setup();
    const toggler = screen.getByRole('button');
    await user.click(toggler);

    // after collapsing we expect the narrow class and labels to be removed
    expect(container.firstChild.className).toEqual(expect.stringContaining('w-16'));
    expect(screen.queryByText('Table Explorer')).toBeNull();
    expect(screen.queryByText('Query')).toBeNull();

    // collapsed items should center content (justify-center) - check via the icon's parent
    const tableIcon = screen.getByTestId('icon-table');
    expect(tableIcon.parentElement.className).toEqual(expect.stringContaining('justify-center'));
  });
});
