/**
 * @jest-environment node
 */

// Mock dependencies
const mockQuery = jest.fn();
const mockWithAuth = jest.fn((handler) => handler);

jest.mock('@/lib/db', () => ({
  pool: {
    query: (...args) => mockQuery(...args),
  },
}));

jest.mock('@/lib/api-helpers', () => ({
  withAuth: (...args) => mockWithAuth(...args),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data, options = {}) => ({
      json: async () => data,
      status: options.status || 200,
      ...options,
    }),
  },
}));

describe('Profile API Route', () => {
  let GET, PUT;

  beforeEach(() => {
    jest.clearAllMocks();
    const route = require('@/app/api/profile/route');
    GET = route.GET;
    PUT = route.PUT;
  });

  describe('GET /api/profile', () => {
    const mockUser = { id: 'user-123' };

    it('should return user profile when it exists', async () => {
      const mockProfile = {
        id: 1,
        user_id: 'user-123',
        email: 'test@example.com',
        username: 'Test User',
        phone_number: '1234567890',
        address: '123 Test St',
        city: 'Test City',
        pincode: '12345',
        nationality: 'Test Nation',
        birth_date: '1990-01-01',
        organization_name: 'Test Org',
        organization_type: 'Company',
        joining_date: '2020-01-01',
        role: 'Developer',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValue({ rows: [mockProfile] });

      const response = await GET({}, {}, mockUser);
      const data = await response.json();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [mockUser.id]
      );
      expect(data.profile).toBeDefined();
      expect(data.profile.user_id).toBe(mockUser.id);
    });

    it('should return user info with null profile fields when profile does not exist', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // First query returns no profile
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: 'user-123',
              email: 'test@example.com',
              username: 'Test User',
            },
          ],
        }); // Second query returns user

      const response = await GET({}, {}, mockUser);
      const data = await response.json();

      expect(data.profile.user_id).toBe(mockUser.id);
      expect(data.profile.email).toBe('test@example.com');
      expect(data.profile.phone_number).toBeNull();
    });

    it('should return 404 when user is not found', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // No profile
        .mockResolvedValueOnce({ rows: [] }); // No user

      const response = await GET({}, {}, mockUser);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      // The actual implementation doesn't have error handling, so it will throw
      await expect(GET({}, {}, mockUser)).rejects.toThrow('Database error');
    });
  });

  describe('PUT /api/profile', () => {
    const mockUser = { id: 'user-123' };

    it('should update existing profile', async () => {
      const updateData = {
        phone_number: '9876543210',
        address: '456 New St',
        city: 'New City',
      };

      // The implementation uses UPSERT, so only one query
      mockQuery.mockResolvedValueOnce({ rows: [{ ...updateData, id: 1, user_id: mockUser.id }] });

      const request = {
        json: async () => updateData,
      };

      const response = await PUT(request, {}, mockUser);
      const data = await response.json();

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(data.profile).toBeDefined();
    });

    it('should create new profile if none exists', async () => {
      const newData = {
        phone_number: '1234567890',
        address: '123 Test St',
      };

      // The implementation uses UPSERT, so only one query
      mockQuery.mockResolvedValueOnce({ rows: [{ ...newData, id: 1, user_id: mockUser.id }] });

      const request = {
        json: async () => newData,
      };

      const response = await PUT(request, {}, mockUser);
      const data = await response.json();

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(data.profile).toBeDefined();
    });

    it('should handle invalid input', async () => {
      // The implementation accepts empty objects and uses defaults (null)
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, user_id: mockUser.id }] });

      const request = {
        json: async () => ({}),
      };

      const response = await PUT(request, {}, mockUser);
      const data = await response.json();
      
      // Should succeed with default values
      expect(response.status).toBe(200);
      expect(data.profile).toBeDefined();
    });

    it('should handle database errors during update', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const request = {
        json: async () => ({ phone_number: '1234567890' }),
      };

      // The actual implementation doesn't have error handling, so it will throw
      await expect(PUT(request, {}, mockUser)).rejects.toThrow('Database error');
    });

    it('should return 500 when upsert returns no rows', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const request = {
        json: async () => ({ phone_number: '1234567890' }),
      };

      const response = await PUT(request, {}, mockUser);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to save profile');
    });

    it('should handle all profile fields', async () => {
      const fullProfile = {
        phone_number: '1234567890',
        address: '123 Test St',
        city: 'Test City',
        pincode: '12345',
        nationality: 'Test Nation',
        birth_date: '1990-01-01',
        organization_name: 'Test Org',
        organization_type: 'Company',
        joining_date: '2020-01-01',
        role: 'Developer'
      };

      mockQuery.mockResolvedValueOnce({ 
        rows: [{ ...fullProfile, id: 1, user_id: mockUser.id }] 
      });

      const request = {
        json: async () => fullProfile,
      };

      const response = await PUT(request, {}, mockUser);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile).toBeDefined();
      expect(data.profile.phone_number).toBe(fullProfile.phone_number);
    });

    it('should handle null body gracefully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, user_id: mockUser.id }] });

      const request = {
        json: async () => null,
      };

      const response = await PUT(request, {}, mockUser);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile).toBeDefined();
    });
  });
});
