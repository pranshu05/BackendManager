import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock next-auth SessionProvider so we can assert props and children easily
jest.mock('next-auth/react', () => ({
  SessionProvider: ({ children, session }) => (
    <div data-testid="session-provider" data-session={JSON.stringify(session)}>{children}</div>
  ),
}));

import AuthProvider from '@/components/AuthProvider';

describe('AuthProvider (minimal)', () => {
  test('forwards session and renders children inside SessionProvider', () => {
    const session = { user: { name: 'Alice' } };
    render(
      <AuthProvider session={session}>
        <div data-testid="child">Hello</div>
      </AuthProvider>
    );

    const sp = screen.getByTestId('session-provider');
    expect(sp).toBeInTheDocument();
    // session prop forwarded as JSON string on our mock
    expect(sp.getAttribute('data-session')).toEqual(JSON.stringify(session));

    // child rendered
    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  test('handles missing session without crashing and still renders children', () => {
    render(
      <AuthProvider>
        <span data-testid="n">No session</span>
      </AuthProvider>
    );

    const sp = screen.getByTestId('session-provider');
    expect(sp).toBeInTheDocument();
    // data-session will not be present when session is undefined (React omits undefined attrs)
    expect(sp.getAttribute('data-session')).toBeNull();
    expect(screen.getByTestId('n')).toHaveTextContent('No session');
  });
});
