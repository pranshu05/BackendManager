/**
 * @jest-environment node
 */

// Mock NextAuth
const mockNextAuth = jest.fn();
const mockHandler = jest.fn();

jest.mock('next-auth', () => mockNextAuth);
jest.mock('@/lib/auth', () => ({
  authOptions: {
    providers: [],
  },
}));

describe('NextAuth API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNextAuth.mockReturnValue(mockHandler);
  });

  it('should configure NextAuth with authOptions', () => {
    require('@/app/api/auth/[...nextauth]/route');
    
    expect(mockNextAuth).toHaveBeenCalled();
    const authOptions = mockNextAuth.mock.calls[0][0];
    expect(authOptions).toBeDefined();
  });

  it('should export handler as GET', () => {
    const { GET } = require('@/app/api/auth/[...nextauth]/route');
    expect(GET).toBe(mockHandler);
  });

  it('should export handler as POST', () => {
    const { POST } = require('@/app/api/auth/[...nextauth]/route');
    expect(POST).toBe(mockHandler);
  });
});
