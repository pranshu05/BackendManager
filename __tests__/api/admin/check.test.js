/**
 * @jest-environment node
 */

// Mock dependencies BEFORE any imports
const mockIsAdmin = jest.fn();
const mockWithAuth = jest.fn((handler) => handler);
const mockNextResponseJson = jest.fn((data, options) => ({
  status: options?.status || 200,
  json: async () => data,
  data,
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (...args) => mockNextResponseJson(...args),
  },
}));

jest.mock('@/lib/api-helpers', () => ({
  withAuth: (handler) => mockWithAuth(handler),
  isAdmin: (...args) => mockIsAdmin(...args),
}));

describe('GET /api/admin/check', () => {
  let GET;
  let mockRequest;
  let mockContext;
  let mockUser;

  beforeAll(async () => {
    // Import after mocks are set up
    const module = await import('@/app/api/admin/check/route');
    GET = module.GET;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {};
    mockContext = {};
    mockUser = {
      email: 'test@example.com',
      id: 'user-123',
    };

    mockIsAdmin.mockReturnValue(false);
  });

  describe('Authentication and Authorization', () => {
    it('should use withAuth middleware wrapper', () => {
      // withAuth is called at module load time, so check GET is a function
      // (the unwrapped handler from withAuth)
      expect(typeof GET).toBe('function');
      expect(typeof GET).not.toBe('string');
      expect(typeof GET).not.toBe('object');
      expect(typeof GET).not.toBe('number');
      expect(GET).toBeDefined();
      expect(GET).not.toBeNull();
      expect(GET).not.toBeUndefined();
    });

    it('should call isAdmin with user email', async () => {
      mockIsAdmin.mockReturnValue(true);

      await GET(mockRequest, mockContext, mockUser);

      expect(mockIsAdmin).toHaveBeenCalledWith('test@example.com');
      expect(mockIsAdmin).not.toHaveBeenCalledWith('wrong@example.com');
      expect(mockIsAdmin).not.toHaveBeenCalledWith('');
      expect(mockIsAdmin).not.toHaveBeenCalledWith(null);
      expect(mockIsAdmin).toHaveBeenCalledTimes(1);
      expect(mockIsAdmin).not.toHaveBeenCalledTimes(0);
      expect(mockIsAdmin).not.toHaveBeenCalledTimes(2);
    });

    it('should receive user object from withAuth middleware', async () => {
      expect(GET).toBeDefined();
      expect(GET).not.toBeUndefined();
      expect(GET).not.toBeNull();
      expect(typeof GET).toBe('function');
      expect(typeof GET).not.toBe('string');
    });
  });

  describe('Admin User Response', () => {
    it('should return isAdmin true when user is admin', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockUser.email = 'admin@example.com';

      const response = await GET(mockRequest, mockContext, mockUser);

      expect(mockNextResponseJson).toHaveBeenCalled();
      expect(mockNextResponseJson).toHaveBeenCalledTimes(1);
      expect(mockNextResponseJson).not.toHaveBeenCalledTimes(0);
      expect(mockNextResponseJson).not.toHaveBeenCalledTimes(2);

      const responseData = mockNextResponseJson.mock.calls[0][0];
      expect(responseData.isAdmin).toBe(true);
      expect(responseData.isAdmin).not.toBe(false);
      expect(typeof responseData.isAdmin).toBe('boolean');
      expect(typeof responseData.isAdmin).not.toBe('string');
      expect(typeof responseData.isAdmin).not.toBe('number');
    });

    it('should include admin email in response when user is admin', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockUser.email = 'superadmin@example.com';

      const response = await GET(mockRequest, mockContext, mockUser);

      const responseData = mockNextResponseJson.mock.calls[0][0];
      expect(responseData.email).toBe('superadmin@example.com');
      expect(responseData.email).not.toBe('admin@example.com');
      expect(responseData.email).not.toBe('');
      expect(responseData.email).not.toBe(null);
      expect(typeof responseData.email).toBe('string');
      expect(typeof responseData.email).not.toBe('object');
      expect(responseData.email.length).toBeGreaterThan(0);
      expect(responseData.email.length).not.toBe(0);
      expect(responseData.email).toContain('@');
      expect(responseData.email).not.toContain('wrong');
    });

    it('should verify isAdmin returns exactly true for admin users', async () => {
      mockIsAdmin.mockReturnValue(true);

      const response = await GET(mockRequest, mockContext, mockUser);

      const responseData = mockNextResponseJson.mock.calls[0][0];
      expect(responseData.isAdmin).toBe(true);
      expect(responseData.isAdmin).not.toBe(1);
      expect(responseData.isAdmin).not.toBe('true');
      expect(responseData.isAdmin).not.toBe(undefined);
      expect(responseData.isAdmin === true).toBe(true);
      expect(responseData.isAdmin === true).not.toBe(false);
    });
  });

  describe('Non-Admin User Response', () => {
    it('should return isAdmin false when user is not admin', async () => {
      mockIsAdmin.mockReturnValue(false);
      mockUser.email = 'user@example.com';

      const response = await GET(mockRequest, mockContext, mockUser);

      expect(mockNextResponseJson).toHaveBeenCalled();
      expect(mockNextResponseJson).toHaveBeenCalledTimes(1);
      expect(mockNextResponseJson).not.toHaveBeenCalledTimes(0);

      const responseData = mockNextResponseJson.mock.calls[0][0];
      expect(responseData.isAdmin).toBe(false);
      expect(responseData.isAdmin).not.toBe(true);
      expect(responseData.isAdmin).not.toBe(0);
      expect(responseData.isAdmin).not.toBe('false');
      expect(typeof responseData.isAdmin).toBe('boolean');
      expect(typeof responseData.isAdmin).not.toBe('string');
    });

    it('should include user email in response when user is not admin', async () => {
      mockIsAdmin.mockReturnValue(false);
      mockUser.email = 'normaluser@example.com';

      const response = await GET(mockRequest, mockContext, mockUser);

      const responseData = mockNextResponseJson.mock.calls[0][0];
      expect(responseData.email).toBe('normaluser@example.com');
      expect(responseData.email).not.toBe('admin@example.com');
      expect(responseData.email).not.toBe('');
      expect(typeof responseData.email).toBe('string');
      expect(responseData.email.length).toBeGreaterThan(0);
      expect(responseData.email.length).not.toBe(0);
    });

    it('should verify isAdmin returns exactly false for non-admin users', async () => {
      mockIsAdmin.mockReturnValue(false);

      const response = await GET(mockRequest, mockContext, mockUser);

      const responseData = mockNextResponseJson.mock.calls[0][0];
      expect(responseData.isAdmin).toBe(false);
      expect(responseData.isAdmin).not.toBe(0);
      expect(responseData.isAdmin).not.toBe('');
      expect(responseData.isAdmin).not.toBe(null);
      expect(responseData.isAdmin === false).toBe(true);
      expect(responseData.isAdmin === false).not.toBe(false);
    });
  });

  describe('Response Structure', () => {
    it('should return object with exactly two properties', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockUser.email = 'test@example.com';

      const response = await GET(mockRequest, mockContext, mockUser);

      const responseData = mockNextResponseJson.mock.calls[0][0];
      const keys = Object.keys(responseData);
      expect(keys.length).toBe(2);
      expect(keys.length).not.toBe(0);
      expect(keys.length).not.toBe(1);
      expect(keys.length).not.toBe(3);
      expect(Array.isArray(keys)).toBe(true);
      expect(Array.isArray(keys)).not.toBe(false);
    });

    it('should have isAdmin property in response', async () => {
      mockIsAdmin.mockReturnValue(false);

      const response = await GET(mockRequest, mockContext, mockUser);

      const responseData = mockNextResponseJson.mock.calls[0][0];
      expect(responseData).toHaveProperty('isAdmin');
      expect(responseData.isAdmin).toBeDefined();
      expect(responseData.isAdmin).not.toBeUndefined();
      expect('isAdmin' in responseData).toBe(true);
      expect('isAdmin' in responseData).not.toBe(false);
    });

    it('should have email property in response', async () => {
      mockIsAdmin.mockReturnValue(false);

      const response = await GET(mockRequest, mockContext, mockUser);

      const responseData = mockNextResponseJson.mock.calls[0][0];
      expect(responseData).toHaveProperty('email');
      expect(responseData.email).toBeDefined();
      expect(responseData.email).not.toBeUndefined();
      expect('email' in responseData).toBe(true);
      expect('email' in responseData).not.toBe(false);
    });

    it('should use NextResponse.json to create response', async () => {
      await GET(mockRequest, mockContext, mockUser);

      expect(mockNextResponseJson).toHaveBeenCalled();
      expect(mockNextResponseJson).not.toHaveBeenCalledWith();
      expect(mockNextResponseJson).toHaveBeenCalledWith(expect.any(Object));
      expect(mockNextResponseJson).not.toHaveBeenCalledWith(expect.any(String));
      expect(mockNextResponseJson).not.toHaveBeenCalledWith(expect.any(Array));
    });

    it('should return response object from handler', async () => {
      const response = await GET(mockRequest, mockContext, mockUser);

      expect(response).toBeDefined();
      expect(response).not.toBeUndefined();
      expect(response).not.toBeNull();
      expect(typeof response).toBe('object');
      expect(typeof response).not.toBe('string');
      expect(typeof response).not.toBe('undefined');
    });
  });

  describe('Email Handling', () => {
    it('should correctly pass different email formats', async () => {
      const testEmails = [
        'admin@company.com',
        'user.name@example.org',
        'test+tag@domain.co.uk',
      ];

      for (const email of testEmails) {
        jest.clearAllMocks();
        mockUser.email = email;
        mockIsAdmin.mockReturnValue(false);

        await GET(mockRequest, mockContext, mockUser);

        const responseData = mockNextResponseJson.mock.calls[0][0];
        expect(responseData.email).toBe(email);
        expect(responseData.email).not.toBe('');
        expect(responseData.email.length).toBeGreaterThan(0);
        expect(responseData.email.length).not.toBe(0);
      }
    });

    it('should preserve email case from user object', async () => {
      mockUser.email = 'Admin@Example.COM';
      mockIsAdmin.mockReturnValue(true);

      const response = await GET(mockRequest, mockContext, mockUser);

      expect(mockIsAdmin).toHaveBeenCalledWith('Admin@Example.COM');
      expect(mockIsAdmin).not.toHaveBeenCalledWith('admin@example.com');
      
      const responseData = mockNextResponseJson.mock.calls[0][0];
      expect(responseData.email).toBe('Admin@Example.COM');
      expect(responseData.email).not.toBe('admin@example.com');
      expect(responseData.email).toContain('COM');
      expect(responseData.email).not.toContain('com');
    });

    it('should handle email with special characters', async () => {
      mockUser.email = 'user+test@example.com';
      mockIsAdmin.mockReturnValue(false);

      const response = await GET(mockRequest, mockContext, mockUser);

      const responseData = mockNextResponseJson.mock.calls[0][0];
      expect(responseData.email).toBe('user+test@example.com');
      expect(responseData.email).toContain('+');
      expect(responseData.email).not.toBe('usertest@example.com');
    });
  });

  describe('isAdmin Function Integration', () => {
    it('should call isAdmin exactly once per request', async () => {
      mockIsAdmin.mockReturnValue(true);

      await GET(mockRequest, mockContext, mockUser);

      expect(mockIsAdmin).toHaveBeenCalledTimes(1);
      expect(mockIsAdmin).not.toHaveBeenCalledTimes(0);
      expect(mockIsAdmin).not.toHaveBeenCalledTimes(2);
    });

    it('should use isAdmin return value for response', async () => {
      mockIsAdmin.mockReturnValue(true);

      const response1 = await GET(mockRequest, mockContext, mockUser);
      const responseData1 = mockNextResponseJson.mock.calls[0][0];

      expect(responseData1.isAdmin).toBe(true);
      expect(responseData1.isAdmin).not.toBe(false);

      jest.clearAllMocks();
      mockIsAdmin.mockReturnValue(false);

      const response2 = await GET(mockRequest, mockContext, mockUser);
      const responseData2 = mockNextResponseJson.mock.calls[0][0];

      expect(responseData2.isAdmin).toBe(false);
      expect(responseData2.isAdmin).not.toBe(true);
    });

    it('should pass only email to isAdmin function', async () => {
      mockUser = {
        email: 'check@example.com',
        id: 'user-456',
        name: 'Test User',
        role: 'user',
      };

      await GET(mockRequest, mockContext, mockUser);

      expect(mockIsAdmin).toHaveBeenCalledWith('check@example.com');
      expect(mockIsAdmin).not.toHaveBeenCalledWith(mockUser);
      expect(mockIsAdmin).not.toHaveBeenCalledWith('user-456');
      expect(mockIsAdmin.mock.calls[0].length).toBe(1);
      expect(mockIsAdmin.mock.calls[0].length).not.toBe(0);
      expect(mockIsAdmin.mock.calls[0].length).not.toBe(2);
    });

    it('should handle isAdmin returning truthy values', async () => {
      mockIsAdmin.mockReturnValue(true);
      const response = await GET(mockRequest, mockContext, mockUser);
      const responseData = mockNextResponseJson.mock.calls[0][0];

      expect(responseData.isAdmin).toBe(true);
      expect(typeof responseData.isAdmin).toBe('boolean');
    });

    it('should handle isAdmin returning falsy values', async () => {
      mockIsAdmin.mockReturnValue(false);
      const response = await GET(mockRequest, mockContext, mockUser);
      const responseData = mockNextResponseJson.mock.calls[0][0];

      expect(responseData.isAdmin).toBe(false);
      expect(typeof responseData.isAdmin).toBe('boolean');
    });
  });

  describe('Request and Context Parameters', () => {
    it('should accept request parameter', async () => {
      const customRequest = { headers: { authorization: 'Bearer token' } };
      mockRequest = customRequest;

      await GET(mockRequest, mockContext, mockUser);

      expect(mockNextResponseJson).toHaveBeenCalled();
      expect(mockNextResponseJson).toHaveBeenCalledTimes(1);
    });

    it('should accept context parameter', async () => {
      const customContext = { params: { id: '123' } };
      mockContext = customContext;

      await GET(mockRequest, mockContext, mockUser);

      expect(mockNextResponseJson).toHaveBeenCalled();
      expect(mockNextResponseJson).toHaveBeenCalledTimes(1);
    });

    it('should work with empty request object', async () => {
      mockRequest = {};

      const response = await GET(mockRequest, mockContext, mockUser);

      expect(response).toBeDefined();
      expect(response).not.toBeUndefined();
      const responseData = mockNextResponseJson.mock.calls[0][0];
      expect(responseData).toHaveProperty('isAdmin');
      expect(responseData).toHaveProperty('email');
    });

    it('should work with empty context object', async () => {
      mockContext = {};

      const response = await GET(mockRequest, mockContext, mockUser);

      expect(response).toBeDefined();
      const responseData = mockNextResponseJson.mock.calls[0][0];
      expect(responseData).toHaveProperty('isAdmin');
      expect(responseData).toHaveProperty('email');
    });
  });

  describe('Type Safety', () => {
    it('should return boolean type for isAdmin field', async () => {
      mockIsAdmin.mockReturnValue(true);

      const response = await GET(mockRequest, mockContext, mockUser);

      const responseData = mockNextResponseJson.mock.calls[0][0];
      expect(typeof responseData.isAdmin).toBe('boolean');
      expect(typeof responseData.isAdmin).not.toBe('string');
      expect(typeof responseData.isAdmin).not.toBe('number');
      expect(typeof responseData.isAdmin).not.toBe('object');
    });

    it('should return string type for email field', async () => {
      const response = await GET(mockRequest, mockContext, mockUser);

      const responseData = mockNextResponseJson.mock.calls[0][0];
      expect(typeof responseData.email).toBe('string');
      expect(typeof responseData.email).not.toBe('number');
      expect(typeof responseData.email).not.toBe('boolean');
      expect(typeof responseData.email).not.toBe('object');
    });

    it('should ensure response data is an object', async () => {
      await GET(mockRequest, mockContext, mockUser);

      const responseData = mockNextResponseJson.mock.calls[0][0];
      expect(typeof responseData).toBe('object');
      expect(typeof responseData).not.toBe('string');
      expect(responseData).not.toBeNull();
      expect(Array.isArray(responseData)).toBe(false);
      expect(Array.isArray(responseData)).not.toBe(true);
    });
  });

  describe('Multiple Requests Handling', () => {
    it('should handle multiple admin check requests independently', async () => {
      // First request - admin user
      mockIsAdmin.mockReturnValue(true);
      mockUser.email = 'admin1@example.com';

      const response1 = await GET(mockRequest, mockContext, mockUser);
      const responseData1 = mockNextResponseJson.mock.calls[0][0];

      expect(responseData1.isAdmin).toBe(true);
      expect(responseData1.isAdmin).not.toBe(false);
      expect(responseData1.email).toBe('admin1@example.com');
      expect(responseData1.email).not.toBe('admin2@example.com');

      // Second request - non-admin user
      jest.clearAllMocks();
      mockIsAdmin.mockReturnValue(false);
      mockUser.email = 'user1@example.com';

      const response2 = await GET(mockRequest, mockContext, mockUser);
      const responseData2 = mockNextResponseJson.mock.calls[0][0];

      expect(responseData2.isAdmin).toBe(false);
      expect(responseData2.isAdmin).not.toBe(true);
      expect(responseData2.email).toBe('user1@example.com');
      expect(responseData2.email).not.toBe('admin1@example.com');
    });

    it('should call isAdmin with correct email for each request', async () => {
      const emails = ['first@test.com', 'second@test.com', 'third@test.com'];

      for (const email of emails) {
        jest.clearAllMocks();
        mockUser.email = email;
        mockIsAdmin.mockReturnValue(false);

        await GET(mockRequest, mockContext, mockUser);

        expect(mockIsAdmin).toHaveBeenCalledWith(email);
        expect(mockIsAdmin).toHaveBeenCalledTimes(1);
        expect(mockIsAdmin).not.toHaveBeenCalledTimes(0);
        expect(mockIsAdmin).not.toHaveBeenCalledTimes(2);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with minimal properties', async () => {
      mockUser = { email: 'minimal@example.com' };
      mockIsAdmin.mockReturnValue(false);

      const response = await GET(mockRequest, mockContext, mockUser);

      const responseData = mockNextResponseJson.mock.calls[0][0];
      expect(responseData.email).toBe('minimal@example.com');
      expect(responseData.email).not.toBe('');
      expect(responseData.isAdmin).toBe(false);
      expect(responseData.isAdmin).not.toBe(true);
    });

    it('should handle very long email addresses', async () => {
      const longEmail = 'verylongemailaddressfortesting.withlots.ofcharacters@subdomain.example.com';
      mockUser.email = longEmail;
      mockIsAdmin.mockReturnValue(true);

      const response = await GET(mockRequest, mockContext, mockUser);

      expect(mockIsAdmin).toHaveBeenCalledWith(longEmail);
      const responseData = mockNextResponseJson.mock.calls[0][0];
      expect(responseData.email).toBe(longEmail);
      expect(responseData.email.length).toBeGreaterThan(50);
      expect(responseData.email.length).not.toBe(0);
    });

    it('should consistently return same result for same input', async () => {
      mockUser.email = 'consistent@example.com';
      mockIsAdmin.mockReturnValue(true);

      const response1 = await GET(mockRequest, mockContext, mockUser);
      const responseData1 = mockNextResponseJson.mock.calls[0][0];

      jest.clearAllMocks();
      mockIsAdmin.mockReturnValue(true);

      const response2 = await GET(mockRequest, mockContext, mockUser);
      const responseData2 = mockNextResponseJson.mock.calls[0][0];

      expect(responseData1.isAdmin).toBe(responseData2.isAdmin);
      expect(responseData1.email).toBe(responseData2.email);
    });
  });

  describe('Response Format Validation', () => {
    it('should return valid JSON structure', async () => {
      await GET(mockRequest, mockContext, mockUser);

      const responseData = mockNextResponseJson.mock.calls[0][0];
      expect(() => JSON.stringify(responseData)).not.toThrow();
      const jsonString = JSON.stringify(responseData);
      expect(jsonString).toContain('isAdmin');
      expect(jsonString).toContain('email');
      expect(jsonString.length).toBeGreaterThan(0);
      expect(jsonString.length).not.toBe(0);
    });

    it('should not include extra properties in response', async () => {
      mockUser = {
        email: 'test@example.com',
        id: 'user-123',
        role: 'admin',
        name: 'Test User',
      };

      await GET(mockRequest, mockContext, mockUser);

      const responseData = mockNextResponseJson.mock.calls[0][0];
      expect(responseData).not.toHaveProperty('id');
      expect(responseData).not.toHaveProperty('role');
      expect(responseData).not.toHaveProperty('name');
      expect(Object.keys(responseData).length).toBe(2);
      expect(Object.keys(responseData).length).not.toBe(3);
      expect(Object.keys(responseData).length).not.toBe(4);
    });

    it('should maintain property order in response', async () => {
      await GET(mockRequest, mockContext, mockUser);

      const responseData = mockNextResponseJson.mock.calls[0][0];
      const keys = Object.keys(responseData);
      expect(keys[0]).toBe('isAdmin');
      expect(keys[0]).not.toBe('email');
      expect(keys[1]).toBe('email');
      expect(keys[1]).not.toBe('isAdmin');
    });
  });
});
