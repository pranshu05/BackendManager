import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';

// Mock the next font import so class variables are predictable
jest.mock('next/font/google', () => ({
  Space_Grotesk: () => ({ variable: '--font-mock' })
}));

// Mock AuthProvider to keep tests simple
jest.mock('@/components/AuthProvider', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="mock-auth">{children}</div>
}));

// Import the layout and metadata
import RootLayout, { metadata } from '@/app/layout';

describe('App RootLayout (app/layout.jsx)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('exports metadata correctly', () => {
    expect(metadata).toBeDefined();
    expect(metadata.title).toBe('DBuddy');
    expect(metadata.description).toMatch(/Ultimate Backend Manager/i);
  });

  test('renders children wrapped by AuthProvider and includes font class on body', () => {
    // Use renderToStaticMarkup to avoid mounting <html> into a test container (avoids nesting errors)
    const markup = renderToStaticMarkup(
      <RootLayout>
        <div data-testid="child-el">child</div>
      </RootLayout>
    );

    // AuthProvider mock should wrap child (present in markup)
    expect(markup).toEqual(expect.stringContaining('data-testid="mock-auth"'));
    expect(markup).toEqual(expect.stringContaining('data-testid="child-el"'));

    // The layout should add the font variable and antialiased to the body class
    expect(markup).toEqual(expect.stringContaining('--font-mock'));
    expect(markup).toEqual(expect.stringContaining('antialiased'));
  });
});
