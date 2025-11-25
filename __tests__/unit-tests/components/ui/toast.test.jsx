import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// mock lucide-react X icon
jest.mock('lucide-react', () => ({
  X: (props) => <svg data-testid="x-icon" {...props} />,
}));

import { Toast, useToast, ToastContainer } from '@/components/ui/toast';

describe('Toast module (minimal)', () => {
  test('Toast calls onClose after duration and cleanup prevents firing after unmount', () => {
    jest.useFakeTimers();

    const onClose = jest.fn();
    const { unmount } = render(<Toast message="hi" duration={1000} onClose={onClose} />);

    // not called immediately
    expect(onClose).not.toHaveBeenCalled();

    // advance time -> should call onClose
    jest.advanceTimersByTime(1000);
    expect(onClose).toHaveBeenCalledTimes(1);

    // mount another and unmount before timeout - cleanup should clear timer
    const onClose2 = jest.fn();
    const r = render(<Toast message="x" duration={1000} onClose={onClose2} />);
    r.unmount();
    jest.advanceTimersByTime(1000);
    expect(onClose2).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  test('Toast close button triggers onClose and bg color changes per type', () => {
    const onClose = jest.fn();
    const { rerender } = render(<Toast message="ok" type="error" onClose={onClose} duration={9999} />);

    // error -> red
    const el = screen.getByText('ok').parentElement;
    expect(el.className).toEqual(expect.stringContaining('bg-red-500'));

    // clicking close should call onClose
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(onClose).toHaveBeenCalled();

    // info/other -> blue
    rerender(<Toast message="info" type="info" onClose={() => {}} duration={9999} />);
    const el2 = screen.getByText('info').parentElement;
    expect(el2.className).toEqual(expect.stringContaining('bg-blue-500'));

    // default (success) -> green
    rerender(<Toast message="ok2" onClose={() => {}} duration={9999} />);
    const el3 = screen.getByText('ok2').parentElement;
    expect(el3.className).toEqual(expect.stringContaining('bg-green-500'));
  });

  test('useToast showToast and removeToast update toasts state', () => {
    // small harness component that exposes the hook
    function Harness() {
      const { toasts, showToast, removeToast } = useToast();
      return (
        <div>
          <div data-testid="count">{toasts.length}</div>
          <button onClick={() => showToast('hi', 'success', 100)}>add</button>
          <button onClick={() => toasts[0] && removeToast(toasts[0].id)}>remove</button>
          <div data-testid="dump">{JSON.stringify(toasts)}</div>
        </div>
      );
    }

    const { getByText } = render(<Harness />);
    const add = getByText('add');
    const remove = getByText('remove');

    // initially empty
    expect(screen.getByTestId('count').textContent).toBe('0');

    fireEvent.click(add);
    // showToast uses Date.now to create id; at least one toast should be present
    expect(screen.getByTestId('count').textContent).toBe('1');

    // remove the toast
    fireEvent.click(remove);
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  test('useToast supports default params and removeToast removes correct item from multiple', () => {
    function Harness2() {
      const { toasts, showToast, removeToast } = useToast();
      return (
        <div>
          <div data-testid="count2">{toasts.length}</div>
          <button onClick={() => showToast('first')}>add1</button>
          <button onClick={() => showToast('second', 'error', 5000)}>add2</button>
          <button onClick={() => toasts[0] && removeToast(toasts[0].id)}>remove</button>
          <div data-testid="dump2">{JSON.stringify(toasts)}</div>
        </div>
      );
    }

    const { getByText } = render(<Harness2 />);
    const add1 = getByText('add1');
    const add2 = getByText('add2');
    const remove = getByText('remove');

    expect(screen.getByTestId('count2').textContent).toBe('0');
    // ensure Date.now() returns unique ids for each toast
    const nowSpy = jest.spyOn(Date, 'now').mockImplementationOnce(() => 1).mockImplementationOnce(() => 2);
    fireEvent.click(add1);
    fireEvent.click(add2);
    expect(screen.getByTestId('count2').textContent).toBe('2');

    // dump should show default type/duration for first toast
    const dump = screen.getByTestId('dump2').textContent;
    expect(dump).toEqual(expect.stringContaining('"type":"success"'));
    expect(dump).toEqual(expect.stringContaining('"duration":3000'));

    // remove first -> count should decrease
    fireEvent.click(remove);
    expect(screen.getByTestId('count2').textContent).toBe('1');

    nowSpy.mockRestore();
  });

  test('ToastContainer renders toasts and onRemove gets called when close pressed', () => {
    const id = 123;
    const toasts = [{ id, message: 'hi', type: 'success', duration: 1000 }];
    const onRemove = jest.fn();
    render(<ToastContainer toasts={toasts} onRemove={onRemove} />);

    expect(screen.getByText('hi')).toBeInTheDocument();
    // click close button -> should call onRemove with id
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(onRemove).toHaveBeenCalledWith(id);
  });

  test('Toast with no onClose still schedules timer and cleans up safely', () => {
    const setSpy = jest.spyOn(global, 'setTimeout').mockImplementation(() => 42);
    const clearSpy = jest.spyOn(global, 'clearTimeout').mockImplementation(() => {});

    const { unmount } = render(<Toast message="noClose" duration={1000} />);
    expect(setSpy).toHaveBeenCalledWith(undefined, 1000);

    unmount();
    expect(clearSpy).toHaveBeenCalledWith(42);

    setSpy.mockRestore();
    clearSpy.mockRestore();
  });

  test('Toast uses default duration when not provided', () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    render(<Toast message="d" onClose={onClose} />);

    // default duration should be 3000ms
    jest.advanceTimersByTime(3000);
    expect(onClose).toHaveBeenCalled();

    jest.useRealTimers();
  });
});
