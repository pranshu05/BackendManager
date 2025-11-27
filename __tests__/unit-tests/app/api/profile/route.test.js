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

    it('should use empty object when body is undefined', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, user_id: mockUser.id }] });

      const request = {
        json: async () => undefined,
      };

      const response = await PUT(request, {}, mockUser);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile).toBeDefined();
      // Verify all parameters are null (default values)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [mockUser.id, null, null, null, null, null, null, null, null, null, null]
      );
    });
  });

  describe('Query Construction and Parameter Passing', () => {
    const mockUser = { id: 'user-123' };

    it('should not execute user query when profile exists', async () => {
      const mockProfile = {
        id: 1,
        user_id: 'user-123',
        email: 'test@example.com',
        username: 'Test User',
      };

      mockQuery.mockResolvedValue({ rows: [mockProfile] });

      await GET({}, {}, mockUser);

      // Should only call query once (for profile), not twice
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).not.toHaveBeenCalledWith(
        expect.stringContaining('SELECT id as user_id, email, name as username FROM users'),
        expect.any(Array)
      );
    });

    it('should execute exact user query with user ID when no profile exists', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ user_id: 'user-123', email: 'test@example.com', username: 'Test' }],
        });

      await GET({}, {}, mockUser);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        'SELECT id as user_id, email, name as username FROM users WHERE id = $1',
        [mockUser.id]
      );
    });

    it('should verify user ID parameter is not empty array', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ user_id: 'user-123', email: 'test@example.com', username: 'Test' }] });

      await GET({}, {}, mockUser);

      const secondCall = mockQuery.mock.calls[1];
      expect(secondCall[1]).toEqual([mockUser.id]);
      expect(secondCall[1]).not.toEqual([]);
      expect(secondCall[1].length).toBe(1);
    });

    it('should execute upsert query with all 11 parameters', async () => {
      const fullData = {
        phone_number: '1234567890',
        address: '123 Test St',
        city: 'Test City',
        pincode: '12345',
        nationality: 'US',
        birth_date: '1990-01-01',
        organization_name: 'Test Org',
        organization_type: 'Company',
        joining_date: '2020-01-01',
        role: 'Developer'
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ ...fullData, id: 1, user_id: mockUser.id }] });

      const request = {
        json: async () => fullData,
      };

      await PUT(request, {}, mockUser);

      // Verify exact parameter array with 11 elements
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [
          mockUser.id,
          fullData.phone_number,
          fullData.address,
          fullData.city,
          fullData.pincode,
          fullData.nationality,
          fullData.birth_date,
          fullData.organization_name,
          fullData.organization_type,
          fullData.joining_date,
          fullData.role
        ]
      );
      
      const callParams = mockQuery.mock.calls[0][1];
      expect(callParams.length).toBe(11);
      expect(callParams).not.toEqual([]);
    });

    it('should include INSERT INTO in upsert query', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, user_id: mockUser.id }] });

      const request = {
        json: async () => ({ phone_number: '1234567890' }),
      };

      await PUT(request, {}, mockUser);

      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('INSERT INTO user_profiles');
      expect(query).toContain('ON CONFLICT (user_id) DO UPDATE SET');
      expect(query).toContain('RETURNING');
      expect(query.length).toBeGreaterThan(100);
    });

    it('should verify all field names in upsert query', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, user_id: mockUser.id }] });

      const request = {
        json: async () => ({}),
      };

      await PUT(request, {}, mockUser);

      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('phone_number');
      expect(query).toContain('address');
      expect(query).toContain('city');
      expect(query).toContain('pincode');
      expect(query).toContain('nationality');
      expect(query).toContain('birth_date');
      expect(query).toContain('organization_name');
      expect(query).toContain('organization_type');
      expect(query).toContain('joining_date');
      expect(query).toContain('role');
      expect(query).toContain('COALESCE');
    });

    it('should handle partial data updates with correct parameter order', async () => {
      const partialData = {
        phone_number: '9876543210',
        city: 'New City',
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ ...partialData, id: 1, user_id: mockUser.id }] });

      const request = {
        json: async () => partialData,
      };

      await PUT(request, {}, mockUser);

      // Verify user_id is first, specified fields are in correct positions, others are null
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [
          mockUser.id,           // $1
          '9876543210',          // $2 - phone_number
          null,                  // $3 - address
          'New City',            // $4 - city
          null,                  // $5 - pincode
          null,                  // $6 - nationality
          null,                  // $7 - birth_date
          null,                  // $8 - organization_name
          null,                  // $9 - organization_type
          null,                  // $10 - joining_date
          null                   // $11 - role
        ]
      );
    });
  });
});
