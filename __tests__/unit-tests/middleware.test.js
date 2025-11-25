// Mock NextResponse before importing middleware
const mockRedirect = jest.fn((url) => ({ redirected: true, url }));
const mockNext = jest.fn(() => ({ next: true }));

jest.mock('next/server', () => ({
  NextResponse: {
    redirect: mockRedirect,
    next: mockNext,
  },
}));

// Mock next-auth/jwt getToken
const mockGetToken = jest.fn();
jest.mock('next-auth/jwt', () => ({
  getToken: (...args) => mockGetToken(...args),
}));

// Set environment variables
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';
process.env.JWT_SECRET = 'test-jwt-secret';

describe('middleware', () => {
  let middleware;

  beforeAll(async () => {
    // Import middleware after mocks are set up
    const middlewareModule = await import('@/middleware');
    middleware = middlewareModule.middleware;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockReset();
    mockRedirect.mockClear();
    mockNext.mockClear();
  });

  const createMockRequest = (pathname, url = 'http://localhost:3000') => ({
    nextUrl: {
      pathname,
    },
    url: url + pathname,
  });

  describe('root path handling', () => {
    it('should redirect authenticated users from / to /dashboard', async () => {
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const request = createMockRequest('/');

      const result = await middleware(request);

      expect(mockGetToken).toHaveBeenCalledWith({
        req: request,
        secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
      });
      expect(mockGetToken).toHaveBeenCalledTimes(1);
      expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({
        href: 'http://localhost:3000/dashboard',
      }));
      expect(mockRedirect).toHaveBeenCalledTimes(1);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(0);
      expect(result.redirected).toBe(true);
      expect(result.url.toString()).toBe('http://localhost:3000/dashboard');
    });

    it('should redirect to /dashboard not /dashboards or other paths', async () => {
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const request = createMockRequest('/');

      await middleware(request);

      const redirectUrl = mockRedirect.mock.calls[0][0].href;
      expect(redirectUrl).toBe('http://localhost:3000/dashboard');
      expect(redirectUrl).not.toBe('http://localhost:3000/dashboards');
      expect(redirectUrl).not.toBe('http://localhost:3000/home');
      expect(redirectUrl).toContain('/dashboard');
      expect(redirectUrl).not.toContain('/profile');
    });

    it('should allow unauthenticated users to access /', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/');

      const result = await middleware(request);

      expect(mockGetToken).toHaveBeenCalled();
      expect(mockGetToken).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledTimes(0);
      expect(result.next).toBe(true);
    });

    it('should check if pathname is exactly /', async () => {
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const request = createMockRequest('/');

      await middleware(request);

      expect(request.nextUrl.pathname).toBe('/');
      expect(request.nextUrl.pathname).not.toBe('/dashboard');
      expect(mockRedirect).toHaveBeenCalled();
    });

    it('should not redirect unauthenticated users from /', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/');

      await middleware(request);

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should verify token truthiness check for root redirect', async () => {
      mockGetToken.mockResolvedValue({ email: 'user@test.com', name: 'Test' });
      const request = createMockRequest('/');

      await middleware(request);

      expect(mockRedirect).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('public routes', () => {
    it('should allow access to /api/auth routes without authentication', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/api/auth/login');

      const result = await middleware(request);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledTimes(0);
      expect(result.next).toBe(true);
    });

    it('should match /api/auth prefix correctly', async () => {
      mockGetToken.mockResolvedValue(null);
      
      const authRoutes = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/logout',
        '/api/auth/session',
        '/api/auth/verify',
      ];

      for (const route of authRoutes) {
        const request = createMockRequest(route);
        await middleware(request);
        expect(mockNext).toHaveBeenCalled();
        mockNext.mockClear();
      }
    });

    it('should allow access to /reset route without authentication', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/reset');

      const result = await middleware(request);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result.next).toBe(true);
    });

    it('should check pathname starts with /api/auth', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/api/auth/test');

      await middleware(request);

      expect(request.nextUrl.pathname.startsWith('/api/auth')).toBe(true);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should check pathname equals /reset', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/reset');

      await middleware(request);

      expect(request.nextUrl.pathname).toBe('/reset');
      expect(request.nextUrl.pathname).not.toBe('/resets');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow authenticated users to access public routes', async () => {
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const request = createMockRequest('/api/auth/session');

      const result = await middleware(request);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result.next).toBe(true);
    });

    it('should not check authentication for public routes', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/reset');

      await middleware(request);

      // Public routes should proceed regardless of token
      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should use OR logic for public route check', async () => {
      mockGetToken.mockResolvedValue(null);
      
      // Test /api/auth route
      const authRequest = createMockRequest('/api/auth/test');
      await middleware(authRequest);
      expect(mockNext).toHaveBeenCalledTimes(1);
      mockNext.mockClear();

      // Test /reset route
      const resetRequest = createMockRequest('/reset');
      await middleware(resetRequest);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('protected routes', () => {
    it('should allow authenticated users to access /dashboard', async () => {
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const request = createMockRequest('/dashboard');

      const result = await middleware(request);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledTimes(0);
      expect(result.next).toBe(true);
    });

    it('should redirect unauthenticated users from /dashboard to /', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/dashboard');

      const result = await middleware(request);

      expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({
        href: 'http://localhost:3000/',
      }));
      expect(mockRedirect).toHaveBeenCalledTimes(1);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(0);
      expect(result.redirected).toBe(true);
    });

    it('should redirect to / not /login or other paths', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/dashboard');

      await middleware(request);

      const redirectUrl = mockRedirect.mock.calls[0][0].href;
      expect(redirectUrl).toBe('http://localhost:3000/');
      expect(redirectUrl).not.toBe('http://localhost:3000/login');
      expect(redirectUrl).not.toBe('http://localhost:3000/auth');
      expect(redirectUrl.endsWith('/')).toBe(true);
    });

    it('should allow authenticated users to access /profile', async () => {
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const request = createMockRequest('/profile');

      const result = await middleware(request);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result.next).toBe(true);
    });

    it('should redirect unauthenticated users from /profile to /', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/profile');

      const result = await middleware(request);

      expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({
        href: 'http://localhost:3000/',
      }));
      expect(result.redirected).toBe(true);
    });

    it('should allow authenticated users to access nested dashboard routes', async () => {
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const request = createMockRequest('/dashboard/projects/123');

      const result = await middleware(request);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result.next).toBe(true);
    });

    it('should redirect unauthenticated users from nested routes to /', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/dashboard/projects/123');

      const result = await middleware(request);

      expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({
        href: 'http://localhost:3000/',
      }));
      expect(result.redirected).toBe(true);
    });

    it('should verify token exists (not null/undefined) for protected routes', async () => {
      // Test with null
      mockGetToken.mockResolvedValue(null);
      const request1 = createMockRequest('/dashboard');
      await middleware(request1);
      expect(mockRedirect).toHaveBeenCalledTimes(1);
      mockRedirect.mockClear();

      // Test with undefined
      mockGetToken.mockResolvedValue(undefined);
      const request2 = createMockRequest('/dashboard');
      await middleware(request2);
      expect(mockRedirect).toHaveBeenCalledTimes(1);
    });

    it('should check if token is truthy for access', async () => {
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const request = createMockRequest('/dashboard');

      await middleware(request);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should check if token is falsy for redirect', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/dashboard');

      await middleware(request);

      expect(mockRedirect).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle multiple protected route prefixes', async () => {
      mockGetToken.mockResolvedValue(null);
      
      const protectedRoutes = [
        '/dashboard',
        '/profile',
        '/dashboard/settings',
        '/profile/edit',
      ];

      for (const route of protectedRoutes) {
        const request = createMockRequest(route);
        await middleware(request);
        expect(mockRedirect).toHaveBeenCalled();
        mockRedirect.mockClear();
        mockNext.mockClear();
      }
    });
  });

  describe('API routes protection', () => {
    it('should allow authenticated users to access protected API routes', async () => {
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const request = createMockRequest('/api/projects/123');

      const result = await middleware(request);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result.next).toBe(true);
    });

    it('should allow unauthenticated access to API routes (API handles its own auth)', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/api/projects/123');

      const result = await middleware(request);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result.next).toBe(true);
    });

    it('should allow access to /api/ai routes', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/api/ai/generate');

      const result = await middleware(request);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result.next).toBe(true);
    });

    it('should not redirect API routes regardless of auth status', async () => {
      const apiRoutes = [
        '/api/projects',
        '/api/ai/test',
        '/api/user_profiles/get',
      ];

      for (const route of apiRoutes) {
        mockGetToken.mockResolvedValue(null);
        const request = createMockRequest(route);
        await middleware(request);
        expect(mockNext).toHaveBeenCalled();
        expect(mockRedirect).not.toHaveBeenCalled();
        mockNext.mockClear();
      }
    });

    it('should allow API routes for both authenticated and unauthenticated', async () => {
      const request1 = createMockRequest('/api/projects/123');
      
      // Unauthenticated
      mockGetToken.mockResolvedValue(null);
      await middleware(request1);
      expect(mockNext).toHaveBeenCalledTimes(1);
      mockNext.mockClear();

      // Authenticated
      mockGetToken.mockResolvedValue({ email: 'test@test.com' });
      const request2 = createMockRequest('/api/projects/456');
      await middleware(request2);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should exclude /api/auth from protected API routes', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/api/auth/login');

      await middleware(request);

      // Should be handled by public routes check, not API routes check
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle getToken errors gracefully and treat as unauthenticated', async () => {
      mockGetToken.mockRejectedValue(new Error('Token error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const request = createMockRequest('/dashboard');

      const result = await middleware(request);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Token retrieval error:', expect.any(Error));
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({
        href: 'http://localhost:3000/',
      }));
      expect(mockRedirect).toHaveBeenCalledTimes(1);
      expect(mockNext).not.toHaveBeenCalled();
      expect(result.redirected).toBe(true);

      consoleErrorSpy.mockRestore();
    });

    it('should catch and log token errors before redirecting', async () => {
      mockGetToken.mockRejectedValue(new Error('JWT malformed'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const request = createMockRequest('/profile');

      await middleware(request);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorArg = consoleErrorSpy.mock.calls[0][1];
      expect(errorArg).toBeInstanceOf(Error);
      expect(errorArg.message).toBe('JWT malformed');

      consoleErrorSpy.mockRestore();
    });

    it('should use JWT_SECRET fallback when NEXTAUTH_SECRET is not available', async () => {
      const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;
      delete process.env.NEXTAUTH_SECRET;
      
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const request = createMockRequest('/dashboard');

      await middleware(request);

      expect(mockGetToken).toHaveBeenCalledWith({
        req: request,
        secret: process.env.JWT_SECRET,
      });
      expect(mockGetToken.mock.calls[0][0].secret).toBe(process.env.JWT_SECRET);
      expect(mockGetToken.mock.calls[0][0].secret).not.toBe(originalNextAuthSecret);

      process.env.NEXTAUTH_SECRET = originalNextAuthSecret;
    });

    it('should prefer NEXTAUTH_SECRET over JWT_SECRET', async () => {
      process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';
      process.env.JWT_SECRET = 'test-jwt-secret';
      
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const request = createMockRequest('/dashboard');

      await middleware(request);

      expect(mockGetToken).toHaveBeenCalledWith({
        req: request,
        secret: 'test-nextauth-secret',
      });
      expect(mockGetToken.mock.calls[0][0].secret).toBe('test-nextauth-secret');
      expect(mockGetToken.mock.calls[0][0].secret).not.toBe('test-jwt-secret');
    });

    it('should use OR operator for secret fallback', async () => {
      delete process.env.NEXTAUTH_SECRET;
      process.env.JWT_SECRET = 'fallback-secret';
      
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const request = createMockRequest('/dashboard');

      await middleware(request);

      const secret = mockGetToken.mock.calls[0][0].secret;
      expect(secret).toBe('fallback-secret');
      expect(secret).toBeTruthy();

      process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';
    });

    it('should redirect on error not continue', async () => {
      mockGetToken.mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const request = createMockRequest('/dashboard');

      await middleware(request);

      expect(mockRedirect).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should treat token error as null token', async () => {
      mockGetToken.mockRejectedValue(new Error('Token expired'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const request = createMockRequest('/dashboard');

      await middleware(request);

      // Should behave same as null token - redirect to /
      expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({
        href: 'http://localhost:3000/',
      }));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle token as empty object', async () => {
      mockGetToken.mockResolvedValue({});
      const request = createMockRequest('/dashboard');

      const result = await middleware(request);

      // Empty object is truthy, so should be treated as authenticated
      expect(mockNext).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledTimes(0);
      expect(result.next).toBe(true);
    });

    it('should verify empty object is truthy', async () => {
      mockGetToken.mockResolvedValue({});
      const request = createMockRequest('/dashboard');

      await middleware(request);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should handle paths with query parameters', async () => {
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const request = createMockRequest('/dashboard');
      request.url = 'http://localhost:3000/dashboard?tab=projects';

      const result = await middleware(request);

      expect(mockNext).toHaveBeenCalled();
      expect(result.next).toBe(true);
    });

    it('should handle paths with trailing slashes', async () => {
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const request = createMockRequest('/dashboard/');

      const result = await middleware(request);

      expect(mockNext).toHaveBeenCalled();
      expect(result.next).toBe(true);
    });

    it('should handle different URL schemes', async () => {
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const request = createMockRequest('/', 'https://example.com');

      await middleware(request);

      expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({
        href: 'https://example.com/dashboard',
      }));
    });

    it('should preserve URL origin in redirects', async () => {
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const request = createMockRequest('/', 'https://myapp.com:3000');

      await middleware(request);

      const redirectUrl = mockRedirect.mock.calls[0][0].href;
      expect(redirectUrl).toContain('https://myapp.com:3000');
      expect(redirectUrl).not.toContain('http://localhost:3000');
    });

    it('should handle undefined token', async () => {
      mockGetToken.mockResolvedValue(undefined);
      const request = createMockRequest('/dashboard');

      await middleware(request);

      expect(mockRedirect).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle token with only non-essential fields', async () => {
      mockGetToken.mockResolvedValue({ randomField: 'value' });
      const request = createMockRequest('/dashboard');

      await middleware(request);

      // Any truthy token object should grant access
      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should handle false token value', async () => {
      mockGetToken.mockResolvedValue(false);
      const request = createMockRequest('/dashboard');

      await middleware(request);

      // false is falsy, should redirect
      expect(mockRedirect).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle zero token value', async () => {
      mockGetToken.mockResolvedValue(0);
      const request = createMockRequest('/dashboard');

      await middleware(request);

      // 0 is falsy, should redirect
      expect(mockRedirect).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle empty string token value', async () => {
      mockGetToken.mockResolvedValue('');
      const request = createMockRequest('/dashboard');

      await middleware(request);

      // empty string is falsy, should redirect
      expect(mockRedirect).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should check pathname equality correctly', async () => {
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const request = createMockRequest('/');

      await middleware(request);

      expect(request.nextUrl.pathname === '/').toBe(true);
      expect(mockRedirect).toHaveBeenCalled();
    });

    it('should use startsWith for route prefix matching', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/api/auth/test/deep/path');

      await middleware(request);

      expect(request.nextUrl.pathname.startsWith('/api/auth')).toBe(true);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle very long pathnames', async () => {
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const longPath = '/dashboard/' + 'a'.repeat(1000);
      const request = createMockRequest(longPath);

      await middleware(request);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle special characters in pathname', async () => {
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const request = createMockRequest('/dashboard/project-123_test');

      await middleware(request);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should check route conditions in correct order', async () => {
      // Root check should come before public routes
      mockGetToken.mockResolvedValue({ email: 'user@test.com' });
      const request = createMockRequest('/');

      await middleware(request);

      // Should redirect to /dashboard, not proceed as public route
      expect(mockRedirect).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('config matcher patterns', () => {
    it('should have correct matcher configuration', () => {
      const { config } = require('@/middleware');
      
      expect(config.matcher).toContain('/');
      expect(config.matcher).toContain('/dashboard/:path*');
      expect(config.matcher).toContain('/api/projects/:path*');
      expect(config.matcher).toContain('/api/ai/:path*');
      expect(config.matcher).toContain('/profile/:path*');
    });

    it('should have matcher as an array', () => {
      const { config } = require('@/middleware');
      
      expect(Array.isArray(config.matcher)).toBe(true);
      expect(config.matcher.length).toBeGreaterThan(0);
    });

    it('should include root path in matcher', () => {
      const { config } = require('@/middleware');
      
      expect(config.matcher.includes('/')).toBe(true);
    });

    it('should include dashboard path with wildcard', () => {
      const { config } = require('@/middleware');
      
      const hasDashboard = config.matcher.some(pattern => 
        pattern.includes('/dashboard') && pattern.includes(':path*')
      );
      expect(hasDashboard).toBe(true);
    });

    it('should include profile path with wildcard', () => {
      const { config } = require('@/middleware');
      
      const hasProfile = config.matcher.some(pattern => 
        pattern.includes('/profile') && pattern.includes(':path*')
      );
      expect(hasProfile).toBe(true);
    });

    it('should include API routes in matcher', () => {
      const { config } = require('@/middleware');
      
      const hasApiProjects = config.matcher.some(pattern => 
        pattern.includes('/api/projects')
      );
      const hasApiAi = config.matcher.some(pattern => 
        pattern.includes('/api/ai')
      );
      
      expect(hasApiProjects).toBe(true);
      expect(hasApiAi).toBe(true);
    });

    it('should have at least 5 matchers', () => {
      const { config } = require('@/middleware');
      
      expect(config.matcher.length).toBeGreaterThanOrEqual(5);
    });
  });
});
