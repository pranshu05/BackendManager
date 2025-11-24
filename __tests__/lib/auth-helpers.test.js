/**
 * @jest-environment jsdom
 */

// Mock fetch globally
global.fetch = jest.fn();

// Mock next-auth/react
const mockSignOut = jest.fn();
const mockUseSession = jest.fn();

jest.mock('next-auth/react', () => ({
  signOut: (...args) => mockSignOut(...args),
  useSession: () => mockUseSession(),
}));

// Mock window.location
delete window.location;
window.location = { href: '' };

describe('auth-helpers', () => {
  let authHelpers;

  beforeAll(() => {
    authHelpers = require('@/lib/auth-helpers');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
    mockSignOut.mockClear();
    mockUseSession.mockClear();
    window.location.href = '';
  });

  describe('registerUser', () => {
    it('should successfully register a user', async () => {
      const mockResponse = { success: true, user: { id: 1, email: 'test@example.com' } };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await authHelpers.registerUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw error on registration failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Email already exists' }),
      });

      await expect(
        authHelpers.registerUser({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        })
      ).rejects.toThrow('Email already exists');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error with rate limiting info', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Too many requests', remainingTime: 60 }),
      });

      try {
        await authHelpers.registerUser({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        });
      } catch (error) {
        expect(error.message).toBe('Too many requests');
        expect(error.message).not.toBe('Too many request');
        expect(error.statusCode).toBe(429);
        expect(error.statusCode).not.toBe(400);
        expect(error.statusCode).not.toBe(500);
        expect(error.remainingTime).toBe(60);
        expect(error.remainingTime).not.toBe(0);
        expect(typeof error.remainingTime).toBe('number');
      }
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should use fallback error message if none provided', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      await expect(
        authHelpers.registerUser({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        })
      ).rejects.toThrow('Registration failed');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should use POST method not GET', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await authHelpers.registerUser({
        name: 'Test',
        email: 'test@example.com',
        password: 'pass',
        confirmPassword: 'pass',
      });

      expect(global.fetch.mock.calls[0][1].method).toBe('POST');
      expect(global.fetch.mock.calls[0][1].method).not.toBe('GET');
      expect(global.fetch.mock.calls[0][1].method).not.toBe('PUT');
    });

    it('should include credentials', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await authHelpers.registerUser({
        name: 'Test',
        email: 'test@example.com',
        password: 'pass',
        confirmPassword: 'pass',
      });

      expect(global.fetch.mock.calls[0][1].credentials).toBe('include');
      expect(global.fetch.mock.calls[0][1].credentials).not.toBe('same-origin');
    });
  });

  describe('checkemail', () => {
    it('should successfully check email', async () => {
      const mockResponse = { success: true, message: 'OTP sent' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await authHelpers.checkemail({ email: 'test@example.com' });

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/emailcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(result.success).not.toBe(false);
      expect(result.message).toBe('OTP sent');
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch.mock.calls[0][0]).toBe('/api/auth/emailcheck');
    });

    it('should throw error when email check fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Email not found' }),
      });

      await expect(
        authHelpers.checkemail({ email: 'nonexistent@example.com' })
      ).rejects.toThrow('Email not found');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should use fallback error message', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      await expect(
        authHelpers.checkemail({ email: 'test@example.com' })
      ).rejects.toThrow('Password reset failed. Account may not exist.');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should use POST method not GET', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await authHelpers.checkemail({ email: 'test@example.com' });

      expect(global.fetch.mock.calls[0][1].method).toBe('POST');
      expect(global.fetch.mock.calls[0][1].method).not.toBe('GET');
    });
  });

  describe('otpcheck', () => {
    it('should successfully verify OTP', async () => {
      const mockResponse = { success: true, verified: true };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await authHelpers.otpcheck({ email: 'test@example.com', otp: '123456' });

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/otpcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', otp: '123456' }),
      });
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.verified).not.toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch.mock.calls[0][0]).toBe('/api/auth/otpcheck');
    });

    it('should throw error when OTP verification fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid OTP' }),
      });

      await expect(
        authHelpers.otpcheck({ email: 'test@example.com', otp: '000000' })
      ).rejects.toThrow('OTP verification failed.');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should use POST method not GET', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await authHelpers.otpcheck({ email: 'test@example.com', otp: '123456' });

      expect(global.fetch.mock.calls[0][1].method).toBe('POST');
      expect(global.fetch.mock.calls[0][1].method).not.toBe('GET');
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password', async () => {
      const mockResponse = { success: true, message: 'Password updated' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await authHelpers.resetPassword({
        email: 'test@example.com',
        newpwd: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/updatepwd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          newpwd: 'newpassword123',
          confirmPassword: 'newpassword123',
        }),
      });
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(result.success).not.toBe(false);
      expect(result.message).toBe('Password updated');
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch.mock.calls[0][0]).toBe('/api/auth/updatepwd');
    });

    it('should throw error when password reset fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Passwords do not match' }),
      });

      await expect(
        authHelpers.resetPassword({
          email: 'test@example.com',
          newpwd: 'newpassword123',
          confirmPassword: 'different',
        })
      ).rejects.toThrow('Passwords do not match');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should use fallback error message', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      await expect(
        authHelpers.resetPassword({
          email: 'test@example.com',
          newpwd: 'newpassword123',
          confirmPassword: 'newpassword123',
        })
      ).rejects.toThrow('Password reset failed.');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should prioritize error over message in error response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Custom error', message: 'Generic message' }),
      });

      await expect(
        authHelpers.resetPassword({
          email: 'test@example.com',
          newpwd: 'newpassword123',
          confirmPassword: 'newpassword123',
        })
      ).rejects.toThrow('Custom error');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should use POST method not GET', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await authHelpers.resetPassword({
        email: 'test@example.com',
        newpwd: 'pass',
        confirmPassword: 'pass',
      });

      expect(global.fetch.mock.calls[0][1].method).toBe('POST');
      expect(global.fetch.mock.calls[0][1].method).not.toBe('GET');
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });
      mockSignOut.mockResolvedValueOnce({ ok: true });

      await authHelpers.logout();

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch.mock.calls[0][0]).toBe('/api/auth/logout');
      expect(global.fetch.mock.calls[0][1].method).toBe('POST');
      expect(global.fetch.mock.calls[0][1].method).not.toBe('GET');
      expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockSignOut.mock.calls[0][0].redirect).toBe(false);
      expect(mockSignOut.mock.calls[0][0].redirect).not.toBe(true);
      expect(window.location.href).toContain('/');
    });

    it('should redirect to home even on logout API error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      mockSignOut.mockResolvedValueOnce({ ok: true });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await authHelpers.logout();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error));
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(window.location.href).toContain('/');
      // mockSignOut not called when fetch fails early
      expect(mockSignOut).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should redirect to home even if NextAuth signOut fails', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });
      mockSignOut.mockRejectedValueOnce(new Error('SignOut error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await authHelpers.logout();

      expect(window.location.href).toContain('/');
      expect(global.fetch).toHaveBeenCalledTimes(1);
      // console.error only called for fetch errors, not signOut errors
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should redirect to home even if both logout calls fail', async () => {
      global.fetch.mockRejectedValueOnce(new Error('API error'));
      mockSignOut.mockRejectedValueOnce(new Error('SignOut error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await authHelpers.logout();

      expect(window.location.href).toContain('/');
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });

    it('should use POST method not GET for logout', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });
      mockSignOut.mockResolvedValueOnce({ ok: true });

      await authHelpers.logout();

      expect(global.fetch.mock.calls[0][1].method).toBe('POST');
      expect(global.fetch.mock.calls[0][1].method).not.toBe('GET');
      expect(global.fetch.mock.calls[0][1].method).not.toBe('DELETE');
    });
  });

  describe('useCurrentUser', () => {
    it('should return authenticated user session', () => {
      const mockSession = {
        user: { id: 1, email: 'test@example.com', name: 'Test User' },
      };
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      const result = authHelpers.useCurrentUser();

      expect(result).toEqual({
        user: mockSession.user,
        isLoading: false,
        isAuthenticated: true,
      });
      expect(result.isLoading).toBe(false);
      expect(result.isLoading).not.toBe(true);
      expect(result.isAuthenticated).toBe(true);
      expect(result.isAuthenticated).not.toBe(false);
      expect(result.user).not.toBeNull();
      expect(result.user.id).toBe(1);
      expect(result.user.email).toBe('test@example.com');
    });

    it('should return null user when not authenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      const result = authHelpers.useCurrentUser();

      expect(result).toEqual({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      expect(result.user).toBeNull();
      expect(result.isAuthenticated).toBe(false);
    });

    it('should indicate loading state', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      });

      const result = authHelpers.useCurrentUser();

      expect(result).toEqual({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      });
      expect(result.isLoading).toBe(true);
      expect(result.isLoading).not.toBe(false);
      expect(result.isAuthenticated).toBe(false);
      expect(result.isAuthenticated).not.toBe(true);
      expect(result.user).toBeNull();
    });

    it('should handle undefined session data', () => {
      mockUseSession.mockReturnValue({
        data: undefined,
        status: 'unauthenticated',
      });

      const result = authHelpers.useCurrentUser();

      expect(result).toEqual({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      expect(result.user).toBeNull();
      expect(result.isAuthenticated).toBe(false);
    });

    it('should handle session without user object', () => {
      mockUseSession.mockReturnValue({
        data: {},
        status: 'authenticated',
      });

      const result = authHelpers.useCurrentUser();

      expect(result).toEqual({
        user: null,
        isLoading: false,
        isAuthenticated: true,
      });
      expect(result.user).toBeNull();
      expect(result.isAuthenticated).toBe(true);
      expect(result.isAuthenticated).not.toBe(false);
    });

    it('should return authenticated status based on string comparison', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 1 } },
        status: 'authenticated',
      });

      const result = authHelpers.useCurrentUser();

      expect(result.isAuthenticated).toBe(true);
      expect(mockUseSession().status).toBe('authenticated');
      expect(mockUseSession().status).not.toBe('unauthenticated');
    });

    it('should return loading based on exact status match', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      });

      const result = authHelpers.useCurrentUser();

      expect(result.isLoading).toBe(true);
      expect(mockUseSession().status).toBe('loading');
      expect(mockUseSession().status).not.toBe('authenticated');
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle network errors in registerUser', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        authHelpers.registerUser({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        })
      ).rejects.toThrow('Network error');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle malformed JSON response in checkemail', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(
        authHelpers.checkemail({ email: 'test@example.com' })
      ).rejects.toThrow();
    });

    it('should handle special characters in email', async () => {
      const mockResponse = { success: true };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const specialEmail = "test+special@example.com";
      await authHelpers.checkemail({ email: specialEmail });

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/emailcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: specialEmail }),
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(callBody.email).toBe(specialEmail);
      expect(callBody.email).toContain('+');
    });

    it('should verify exact status codes', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      try {
        await authHelpers.registerUser({
          name: 'Test',
          email: 'test@example.com',
          password: 'pass',
          confirmPassword: 'pass',
        });
      } catch (error) {
        expect(error.statusCode).toBe(401);
        expect(error.statusCode).not.toBe(400);
        expect(error.statusCode).not.toBe(500);
      }
    });

    it('should handle empty response objects', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      await expect(
        authHelpers.otpcheck({ email: 'test@example.com', otp: '123456' })
      ).rejects.toThrow('OTP verification failed.');
    });
  });
});
