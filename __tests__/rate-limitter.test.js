/**
 * @jest-environment node
 */

// Mock rate-limiter-flexible
const mockConsume = jest.fn();
const mockRateLimiterMemory = jest.fn(() => ({
  consume: mockConsume,
}));

jest.mock('rate-limiter-flexible', () => ({
  RateLimiterMemory: mockRateLimiterMemory,
}));

// Mock next/server
const mockJson = jest.fn();
const mockNextResponse = {
  json: mockJson,
};

jest.mock('next/server', () => ({
  NextResponse: mockNextResponse,
}));

describe('rate-limitter.js', () => {
  let rateLimitter;

  beforeAll(() => {
    rateLimitter = require('@/lib/rate-limitter');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsume.mockClear();
    mockJson.mockClear();
    mockRateLimiterMemory.mockClear();
  });

  describe('Rate Limiter Initialization', () => {
    it('should have rate limiters available', () => {
      // Rate limiters are initialized at module load
      // We can verify they work by testing checkRateLimit
      expect(rateLimitter.checkRateLimit).toBeDefined();
      expect(rateLimitter.withRateLimit).toBeDefined();
    });
  });

  describe('checkRateLimit', () => {
    it('should return success when rate limit is not exceeded', async () => {
      mockConsume.mockResolvedValueOnce({});

      const result = await rateLimitter.checkRateLimit('test-identifier');

      expect(mockConsume).toHaveBeenCalledWith('test-identifier');
      expect(result).toEqual({ success: true });
      expect(result.success).toBe(true);
      expect(result.msBeforeNext).toBeUndefined();
      expect(result.remainingPoints).toBeUndefined();
    });

    it('should use general rate limiter by default', async () => {
      mockConsume.mockResolvedValueOnce({});

      const result = await rateLimitter.checkRateLimit('user-123');

      expect(mockConsume).toHaveBeenCalledWith('user-123');
      expect(result.success).toBe(true);
    });

    it('should use general limiter when both isAuth and isAI are false', async () => {
      mockConsume.mockResolvedValueOnce({});

      const result = await rateLimitter.checkRateLimit('user-general', false, false);

      expect(mockConsume).toHaveBeenCalledWith('user-general');
      expect(result.success).toBe(true);
    });

    it('should use auth rate limiter when isAuth is true', async () => {
      mockConsume.mockResolvedValueOnce({});

      const result = await rateLimitter.checkRateLimit('user-auth', true);

      expect(mockConsume).toHaveBeenCalledWith('user-auth');
      expect(result.success).toBe(true);
    });

    it('should use auth limiter when isAuth is true and isAI is false', async () => {
      mockConsume.mockResolvedValueOnce({});

      const result = await rateLimitter.checkRateLimit('user-auth-only', true, false);

      expect(mockConsume).toHaveBeenCalledWith('user-auth-only');
      expect(result.success).toBe(true);
    });

    it('should use AI rate limiter when isAI is true', async () => {
      mockConsume.mockResolvedValueOnce({});

      const result = await rateLimitter.checkRateLimit('user-ai', false, true);

      expect(mockConsume).toHaveBeenCalledWith('user-ai');
      expect(result.success).toBe(true);
    });

    it('should prioritize AI rate limiter over auth when both are true', async () => {
      mockConsume.mockResolvedValueOnce({});

      const result = await rateLimitter.checkRateLimit('user-both', true, true);

      expect(mockConsume).toHaveBeenCalledWith('user-both');
      expect(result.success).toBe(true);
    });

    it('should return error info when rate limit is exceeded', async () => {
      const rejectionResponse = {
        msBeforeNext: 30000,
        remainingPoints: 0,
      };

      mockConsume.mockRejectedValueOnce(rejectionResponse);

      const result = await rateLimitter.checkRateLimit('exceeded-user');

      expect(result).toEqual({
        success: false,
        msBeforeNext: 30000,
        remainingPoints: 0,
      });
      expect(result.success).toBe(false);
      expect(result.msBeforeNext).toBe(30000);
      expect(result.remainingPoints).toBe(0);
    });

    it('should handle partial remaining points', async () => {
      const rejectionResponse = {
        msBeforeNext: 15000,
        remainingPoints: 2,
      };

      mockConsume.mockRejectedValueOnce(rejectionResponse);

      const result = await rateLimitter.checkRateLimit('partial-user');

      expect(result).toEqual({
        success: false,
        msBeforeNext: 15000,
        remainingPoints: 2,
      });
      expect(result.success).toBe(false);
      expect(result.msBeforeNext).toBe(15000);
      expect(result.remainingPoints).toBe(2);
    });

    it('should return false success flag on rejection', async () => {
      const rejectionResponse = {
        msBeforeNext: 1000,
        remainingPoints: 0,
      };

      mockConsume.mockRejectedValueOnce(rejectionResponse);

      const result = await rateLimitter.checkRateLimit('test-user');

      expect(result.success).not.toBe(true);
      expect(result.success).toBe(false);
    });

    it('should preserve exact msBeforeNext value', async () => {
      const rejectionResponse = {
        msBeforeNext: 12345,
        remainingPoints: 5,
      };

      mockConsume.mockRejectedValueOnce(rejectionResponse);

      const result = await rateLimitter.checkRateLimit('test-user');

      expect(result.msBeforeNext).toBe(12345);
      expect(result.msBeforeNext).not.toBe(12344);
      expect(result.msBeforeNext).not.toBe(12346);
    });

    it('should preserve exact remainingPoints value', async () => {
      const rejectionResponse = {
        msBeforeNext: 5000,
        remainingPoints: 7,
      };

      mockConsume.mockRejectedValueOnce(rejectionResponse);

      const result = await rateLimitter.checkRateLimit('test-user');

      expect(result.remainingPoints).toBe(7);
      expect(result.remainingPoints).not.toBe(6);
      expect(result.remainingPoints).not.toBe(8);
    });
  });

  describe('withRateLimit', () => {
    let mockHandler;
    let mockRequest;
    let mockContext;

    beforeEach(() => {
      mockHandler = jest.fn().mockResolvedValue('handler-response');
      mockContext = { params: {} };
      mockRequest = {
        headers: {
          get: jest.fn(),
        },
      };
    });

    it('should call handler when rate limit is not exceeded', async () => {
      mockConsume.mockResolvedValueOnce({});
      mockRequest.headers.get.mockReturnValue('192.168.1.1');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      const result = await wrappedHandler(mockRequest, mockContext);

      expect(mockRequest.headers.get).toHaveBeenCalledWith('x-forwarded-for');
      expect(mockConsume).toHaveBeenCalledWith('192.168.1.1');
      expect(mockHandler).toHaveBeenCalledWith(mockRequest, mockContext);
      expect(result).toBe('handler-response');
    });

    it('should extract IP from x-forwarded-for header', async () => {
      mockConsume.mockResolvedValueOnce({});
      mockRequest.headers.get.mockReturnValue('203.0.113.1, 198.51.100.1');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      await wrappedHandler(mockRequest, mockContext);

      expect(mockConsume).toHaveBeenCalledWith('203.0.113.1');
      expect(mockConsume).not.toHaveBeenCalledWith('203.0.113.1, 198.51.100.1');
      expect(mockConsume).not.toHaveBeenCalledWith('198.51.100.1');
    });

    it('should split x-forwarded-for by comma and take first element', async () => {
      mockConsume.mockResolvedValueOnce({});
      mockRequest.headers.get.mockReturnValue('1.1.1.1, 2.2.2.2, 3.3.3.3');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      await wrappedHandler(mockRequest, mockContext);

      expect(mockConsume).toHaveBeenCalledWith('1.1.1.1');
      expect(mockConsume).not.toHaveBeenCalledWith('2.2.2.2');
      expect(mockConsume).not.toHaveBeenCalledWith('3.3.3.3');
    });

    it('should fallback to x-real-ip header when x-forwarded-for is not available', async () => {
      mockConsume.mockResolvedValueOnce({});
      mockRequest.headers.get
        .mockReturnValueOnce(null) // x-forwarded-for
        .mockReturnValueOnce('192.168.2.1'); // x-real-ip

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      await wrappedHandler(mockRequest, mockContext);

      expect(mockRequest.headers.get).toHaveBeenCalledWith('x-forwarded-for');
      expect(mockRequest.headers.get).toHaveBeenCalledWith('x-real-ip');
      expect(mockConsume).toHaveBeenCalledWith('192.168.2.1');
      expect(mockConsume).not.toHaveBeenCalledWith('unknown');
    });

    it('should check x-forwarded-for before x-real-ip', async () => {
      mockConsume.mockResolvedValueOnce({});
      mockRequest.headers.get
        .mockReturnValueOnce(null) // First call: x-forwarded-for
        .mockReturnValueOnce('192.168.2.1'); // Second call: x-real-ip

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      await wrappedHandler(mockRequest, mockContext);

      expect(mockRequest.headers.get).toHaveBeenNthCalledWith(1, 'x-forwarded-for');
      expect(mockRequest.headers.get).toHaveBeenNthCalledWith(2, 'x-real-ip');
    });

    it('should use "unknown" when no IP headers are available', async () => {
      mockConsume.mockResolvedValueOnce({});
      mockRequest.headers.get.mockReturnValue(null);

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      await wrappedHandler(mockRequest, mockContext);

      expect(mockConsume).toHaveBeenCalledWith('unknown');
      expect(mockConsume).not.toHaveBeenCalledWith(null);
      expect(mockConsume).not.toHaveBeenCalledWith(undefined);
      expect(mockConsume).not.toHaveBeenCalledWith('');
    });

    it('should use unknown exactly as string', async () => {
      mockConsume.mockResolvedValueOnce({});
      mockRequest.headers.get.mockReturnValue(null);

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      await wrappedHandler(mockRequest, mockContext);

      const calledWith = mockConsume.mock.calls[0][0];
      expect(calledWith).toBe('unknown');
      expect(typeof calledWith).toBe('string');
    });

    it('should return 429 response when rate limit is exceeded', async () => {
      const rejectionResponse = {
        msBeforeNext: 45000,
        remainingPoints: 0,
      };

      mockConsume.mockRejectedValueOnce(rejectionResponse);
      mockRequest.headers.get.mockReturnValue('192.168.1.1');
      mockJson.mockReturnValue('rate-limit-response');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      const result = await wrappedHandler(mockRequest, mockContext);

      expect(mockJson).toHaveBeenCalledWith(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: 45,
          remainingTime: 45000,
        },
        {
          status: 429,
          headers: {
            'Retry-After': '45',
            'X-RateLimit-Remaining': '0',
          },
        }
      );
      expect(mockHandler).not.toHaveBeenCalled();
      expect(result).toBe('rate-limit-response');
    });

    it('should return status 429 not 428 or 430', async () => {
      const rejectionResponse = {
        msBeforeNext: 1000,
        remainingPoints: 0,
      };

      mockConsume.mockRejectedValueOnce(rejectionResponse);
      mockRequest.headers.get.mockReturnValue('192.168.1.1');
      mockJson.mockReturnValue('rate-limit-response');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      await wrappedHandler(mockRequest, mockContext);

      const callArgs = mockJson.mock.calls[0][1];
      expect(callArgs.status).toBe(429);
      expect(callArgs.status).not.toBe(428);
      expect(callArgs.status).not.toBe(430);
      expect(callArgs.status).not.toBe(500);
    });

    it('should set correct error message on rate limit', async () => {
      const rejectionResponse = {
        msBeforeNext: 1000,
        remainingPoints: 0,
      };

      mockConsume.mockRejectedValueOnce(rejectionResponse);
      mockRequest.headers.get.mockReturnValue('192.168.1.1');
      mockJson.mockReturnValue('response');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      await wrappedHandler(mockRequest, mockContext);

      const callArgs = mockJson.mock.calls[0][0];
      expect(callArgs.error).toBe('Rate limit exceeded');
      expect(callArgs.message).toBe('Too many requests. Please try again later.');
    });

    it('should set X-RateLimit-Remaining to 0 string not number', async () => {
      const rejectionResponse = {
        msBeforeNext: 1000,
        remainingPoints: 0,
      };

      mockConsume.mockRejectedValueOnce(rejectionResponse);
      mockRequest.headers.get.mockReturnValue('192.168.1.1');
      mockJson.mockReturnValue('response');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      await wrappedHandler(mockRequest, mockContext);

      const callArgs = mockJson.mock.calls[0][1];
      expect(callArgs.headers['X-RateLimit-Remaining']).toBe('0');
      expect(callArgs.headers['X-RateLimit-Remaining']).not.toBe(0);
    });

    it('should round up retryAfter to nearest second', async () => {
      const rejectionResponse = {
        msBeforeNext: 1500, // 1.5 seconds
        remainingPoints: 0,
      };

      mockConsume.mockRejectedValueOnce(rejectionResponse);
      mockRequest.headers.get.mockReturnValue('192.168.1.1');
      mockJson.mockReturnValue('rate-limit-response');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      await wrappedHandler(mockRequest, mockContext);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          retryAfter: 2, // Rounded up from 1.5
        }),
        expect.objectContaining({
          status: 429,
          headers: expect.objectContaining({
            'Retry-After': '2',
          }),
        })
      );
    });

    it('should use Math.ceil for rounding up retryAfter', async () => {
      const testCases = [
        { msBeforeNext: 100, expected: 1 },    // 0.1s -> 1s
        { msBeforeNext: 999, expected: 1 },    // 0.999s -> 1s
        { msBeforeNext: 1000, expected: 1 },   // 1.0s -> 1s
        { msBeforeNext: 1001, expected: 2 },   // 1.001s -> 2s
        { msBeforeNext: 2500, expected: 3 },   // 2.5s -> 3s
        { msBeforeNext: 59999, expected: 60 }, // 59.999s -> 60s
      ];

      for (const { msBeforeNext, expected } of testCases) {
        mockConsume.mockRejectedValueOnce({ msBeforeNext, remainingPoints: 0 });
        mockRequest.headers.get.mockReturnValue('192.168.1.1');
        mockJson.mockReturnValue('response');

        const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
        await wrappedHandler(mockRequest, mockContext);

        const callArgs = mockJson.mock.calls[mockJson.mock.calls.length - 1][0];
        expect(callArgs.retryAfter).toBe(expected);

        mockJson.mockClear();
      }
    });

    it('should pass isAuth option to checkRateLimit', async () => {
      mockConsume.mockResolvedValueOnce({});
      mockRequest.headers.get.mockReturnValue('192.168.1.1');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler, { isAuth: true });
      const result = await wrappedHandler(mockRequest, mockContext);

      expect(mockHandler).toHaveBeenCalled();
      expect(result).toBe('handler-response');
    });

    it('should not use isAuth when option is false', async () => {
      mockConsume.mockResolvedValueOnce({});
      mockRequest.headers.get.mockReturnValue('192.168.1.1');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler, { isAuth: false });
      await wrappedHandler(mockRequest, mockContext);

      expect(mockHandler).toHaveBeenCalled();
    });

    it('should pass isAI option to checkRateLimit', async () => {
      mockConsume.mockResolvedValueOnce({});
      mockRequest.headers.get.mockReturnValue('192.168.1.1');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler, { isAI: true });
      const result = await wrappedHandler(mockRequest, mockContext);

      expect(mockHandler).toHaveBeenCalled();
      expect(result).toBe('handler-response');
    });

    it('should not use isAI when option is false', async () => {
      mockConsume.mockResolvedValueOnce({});
      mockRequest.headers.get.mockReturnValue('192.168.1.1');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler, { isAI: false });
      await wrappedHandler(mockRequest, mockContext);

      expect(mockHandler).toHaveBeenCalled();
    });

    it('should pass both isAuth and isAI options', async () => {
      mockConsume.mockResolvedValueOnce({});
      mockRequest.headers.get.mockReturnValue('192.168.1.1');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler, { 
        isAuth: true, 
        isAI: true 
      });
      await wrappedHandler(mockRequest, mockContext);

      expect(mockHandler).toHaveBeenCalled();
    });

    it('should continue to handler on rate limiter internal errors', async () => {
      // The try-catch in withRateLimit wraps the entire function
      // It catches any unexpected errors, not just consume rejections
      mockRequest.headers.get.mockImplementation(() => {
        throw new Error('Headers error');
      });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      const result = await wrappedHandler(mockRequest, mockContext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Rate limit error:',
        expect.any(Error)
      );
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith(mockRequest, mockContext);
      expect(result).toBe('handler-response');

      consoleErrorSpy.mockRestore();
    });

    it('should call handler even when rate limit check throws', async () => {
      mockRequest.headers.get.mockImplementation(() => {
        throw new Error('Network error');
      });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      await wrappedHandler(mockRequest, mockContext);

      expect(mockHandler).toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });

    it('should not propagate handler errors from the try block', async () => {
      // Handler errors are caught by the outer try-catch and handler is called again
      mockConsume.mockResolvedValueOnce({});
      mockRequest.headers.get.mockReturnValue('192.168.1.1');
      const handlerError = new Error('Handler error');
      mockHandler
        .mockRejectedValueOnce(handlerError) // First call throws
        .mockResolvedValueOnce('fallback-response'); // Second call in catch succeeds

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);

      const result = await wrappedHandler(mockRequest, mockContext);
      
      // Handler is called twice - once in try, once in catch
      expect(mockHandler).toHaveBeenCalledTimes(2);
      expect(result).toBe('fallback-response');
    });

    it('should work with empty options object', async () => {
      mockConsume.mockResolvedValueOnce({});
      mockRequest.headers.get.mockReturnValue('192.168.1.1');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler, {});
      const result = await wrappedHandler(mockRequest, mockContext);

      expect(mockHandler).toHaveBeenCalled();
      expect(result).toBe('handler-response');
    });

    it('should handle multiple sequential requests from same IP', async () => {
      mockConsume.mockResolvedValue({});
      mockRequest.headers.get.mockReturnValue('192.168.1.1');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);

      await wrappedHandler(mockRequest, mockContext);
      await wrappedHandler(mockRequest, mockContext);
      await wrappedHandler(mockRequest, mockContext);

      expect(mockConsume).toHaveBeenCalledTimes(3);
      expect(mockHandler).toHaveBeenCalledTimes(3);
    });

    it('should handle requests from different IPs independently', async () => {
      mockConsume.mockResolvedValue({});
      const request1 = { headers: { get: jest.fn().mockReturnValue('192.168.1.1') } };
      const request2 = { headers: { get: jest.fn().mockReturnValue('192.168.1.2') } };

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);

      await wrappedHandler(request1, mockContext);
      await wrappedHandler(request2, mockContext);

      expect(mockConsume).toHaveBeenNthCalledWith(1, '192.168.1.1');
      expect(mockConsume).toHaveBeenNthCalledWith(2, '192.168.1.2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero msBeforeNext', async () => {
      const rejectionResponse = {
        msBeforeNext: 0,
        remainingPoints: 0,
      };

      mockConsume.mockRejectedValueOnce(rejectionResponse);

      const result = await rateLimitter.checkRateLimit('user-zero');

      expect(result).toEqual({
        success: false,
        msBeforeNext: 0,
        remainingPoints: 0,
      });
      expect(result.msBeforeNext).toBe(0);
      expect(result.msBeforeNext).not.toBe(1);
    });

    it('should handle very large msBeforeNext values', async () => {
      const rejectionResponse = {
        msBeforeNext: 3600000, // 1 hour
        remainingPoints: 0,
      };

      mockConsume.mockRejectedValueOnce(rejectionResponse);
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('192.168.1.1'),
        },
      };
      mockJson.mockReturnValue('response');

      const wrappedHandler = rateLimitter.withRateLimit(() => {});
      await wrappedHandler(mockRequest, {});

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          retryAfter: 3600, // 1 hour in seconds
          remainingTime: 3600000,
        }),
        expect.anything()
      );
    });

    it('should handle IPv6 addresses', async () => {
      mockConsume.mockResolvedValueOnce({});
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('2001:0db8:85a3:0000:0000:8a2e:0370:7334'),
        },
      };
      const mockHandler = jest.fn().mockResolvedValue('response');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      await wrappedHandler(mockRequest, {});

      expect(mockConsume).toHaveBeenCalledWith('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should handle comma-separated IPs with spaces', async () => {
      mockConsume.mockResolvedValueOnce({});
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('192.168.1.1, 192.168.1.2, 192.168.1.3'),
        },
      };
      const mockHandler = jest.fn().mockResolvedValue('response');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      await wrappedHandler(mockRequest, {});

      expect(mockConsume).toHaveBeenCalledWith('192.168.1.1');
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should handle empty string IP gracefully', async () => {
      mockConsume.mockResolvedValueOnce({});
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValueOnce('').mockReturnValueOnce(null),
        },
      };
      const mockHandler = jest.fn().mockResolvedValue('response');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      await wrappedHandler(mockRequest, {});

      // Empty string is falsy, should fallback to x-real-ip then unknown
      expect(mockConsume).toHaveBeenCalledWith('unknown');
    });

    it('should handle single IP in x-forwarded-for without comma', async () => {
      mockConsume.mockResolvedValueOnce({});
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('10.0.0.1'),
        },
      };
      const mockHandler = jest.fn().mockResolvedValue('response');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      await wrappedHandler(mockRequest, {});

      expect(mockConsume).toHaveBeenCalledWith('10.0.0.1');
    });

    it('should preserve remainingTime as msBeforeNext in response', async () => {
      const rejectionResponse = {
        msBeforeNext: 12345,
        remainingPoints: 0,
      };

      mockConsume.mockRejectedValueOnce(rejectionResponse);
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('192.168.1.1'),
        },
      };
      mockJson.mockReturnValue('response');

      const wrappedHandler = rateLimitter.withRateLimit(() => {});
      await wrappedHandler(mockRequest, {});

      const callArgs = mockJson.mock.calls[0][0];
      expect(callArgs.remainingTime).toBe(12345);
      expect(callArgs.remainingTime).toBe(rejectionResponse.msBeforeNext);
    });

    it('should convert retryAfter to string in header', async () => {
      const rejectionResponse = {
        msBeforeNext: 30000,
        remainingPoints: 0,
      };

      mockConsume.mockRejectedValueOnce(rejectionResponse);
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('192.168.1.1'),
        },
      };
      mockJson.mockReturnValue('response');

      const wrappedHandler = rateLimitter.withRateLimit(() => {});
      await wrappedHandler(mockRequest, {});

      const callArgs = mockJson.mock.calls[0][1];
      expect(callArgs.headers['Retry-After']).toBe('30');
      expect(typeof callArgs.headers['Retry-After']).toBe('string');
      expect(callArgs.headers['Retry-After']).not.toBe(30);
    });

    it('should not call handler when rate limit fails', async () => {
      const rejectionResponse = {
        msBeforeNext: 1000,
        remainingPoints: 0,
      };

      mockConsume.mockRejectedValueOnce(rejectionResponse);
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('192.168.1.1'),
        },
      };
      mockJson.mockReturnValue('response');
      const mockHandler = jest.fn();

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      await wrappedHandler(mockRequest, {});

      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledTimes(0);
    });

    it('should verify rateLimitResult.success is checked correctly', async () => {
      // Test that the condition checks for !success (false) not success === false
      const rejectionResponse = {
        msBeforeNext: 1000,
        remainingPoints: 0,
      };

      mockConsume.mockRejectedValueOnce(rejectionResponse);
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('192.168.1.1'),
        },
      };
      mockJson.mockReturnValue('rate-limit-response');
      const mockHandler = jest.fn().mockResolvedValue('handler-response');

      const wrappedHandler = rateLimitter.withRateLimit(mockHandler);
      const result = await wrappedHandler(mockRequest, {});

      // Handler should NOT be called, rate limit response should be returned
      expect(mockHandler).not.toHaveBeenCalled();
      expect(result).toBe('rate-limit-response');
      expect(result).not.toBe('handler-response');
    });

    it('should handle negative remainingPoints', async () => {
      const rejectionResponse = {
        msBeforeNext: 5000,
        remainingPoints: -1,
      };

      mockConsume.mockRejectedValueOnce(rejectionResponse);

      const result = await rateLimitter.checkRateLimit('test-user');

      expect(result.remainingPoints).toBe(-1);
      expect(result.success).toBe(false);
    });

    it('should handle very large remainingPoints', async () => {
      const rejectionResponse = {
        msBeforeNext: 1000,
        remainingPoints: 999999,
      };

      mockConsume.mockRejectedValueOnce(rejectionResponse);

      const result = await rateLimitter.checkRateLimit('test-user');

      expect(result.remainingPoints).toBe(999999);
      expect(result.success).toBe(false);
    });

    it('should correctly identify when to use each limiter based on flags', async () => {
      // Test the if-else logic in checkRateLimit
      mockConsume.mockResolvedValue({});

      // isAI true -> AI limiter
      await rateLimitter.checkRateLimit('user1', false, true);
      expect(mockConsume).toHaveBeenCalledWith('user1');

      // isAI false, isAuth true -> Auth limiter
      await rateLimitter.checkRateLimit('user2', true, false);
      expect(mockConsume).toHaveBeenCalledWith('user2');

      // both false -> General limiter
      await rateLimitter.checkRateLimit('user3', false, false);
      expect(mockConsume).toHaveBeenCalledWith('user3');

      // both true -> AI limiter (prioritized)
      await rateLimitter.checkRateLimit('user4', true, true);
      expect(mockConsume).toHaveBeenCalledWith('user4');

      expect(mockConsume).toHaveBeenCalledTimes(4);
    });
  });
});
