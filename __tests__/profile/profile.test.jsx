import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from '@/app/profile/page';

// Mock the child components
jest.mock('@/components/(profile)/ProfileHeader', () => {
  return function MockProfileHeader() {
    return <div data-testid="profile-header">Profile Header</div>;
  };
});

jest.mock('@/components/(profile)/ProfileAvatar', () => {
  return function MockProfileAvatar({ username, email }) {
    return <div data-testid="profile-avatar">Avatar: {username} - {email}</div>;
  };
});

jest.mock('@/components/(profile)/ContactInfoSection', () => {
  return function MockContactInfoSection({
    contactForm,
    contactChanged,
    savingContact,
    onContactChange,
    onSave
  }) {
    return (
      <div data-testid="contact-section">
        <input
          data-testid="phone-input"
          value={contactForm.phone_number}
          onChange={(e) => onContactChange('phone_number', e.target.value)}
          placeholder="Phone"
        />
        <input
          data-testid="address-input"
          value={contactForm.address}
          onChange={(e) => onContactChange('address', e.target.value)}
          placeholder="Address"
        />
        <input
          data-testid="city-input"
          value={contactForm.city}
          onChange={(e) => onContactChange('city', e.target.value)}
          placeholder="City"
        />
        <input
          data-testid="pincode-input"
          value={contactForm.pincode}
          onChange={(e) => onContactChange('pincode', e.target.value)}
          placeholder="Pincode"
        />
        <button
          data-testid="save-contact-btn"
          onClick={onSave}
          disabled={savingContact}
        >
          {savingContact ? 'Saving...' : 'Save Contact'}
        </button>
        {contactChanged && <span data-testid="contact-changed">Changed</span>}
      </div>
    );
  };
});

jest.mock('@/components/(profile)/GeneralInfoSection', () => {
  return function MockGeneralInfoSection({
    generalForm,
    generalChanged,
    savingGeneral,
    onGeneralChange,
    onSave
  }) {
    return (
      <div data-testid="general-section">
        <input
          data-testid="nationality-input"
          value={generalForm.nationality}
          onChange={(e) => onGeneralChange('nationality', e.target.value)}
          placeholder="Nationality"
        />
        <input
          data-testid="birth-date-input"
          type="date"
          value={generalForm.birth_date}
          onChange={(e) => onGeneralChange('birth_date', e.target.value)}
        />
        <input
          data-testid="org-name-input"
          value={generalForm.organization_name}
          onChange={(e) => onGeneralChange('organization_name', e.target.value)}
          placeholder="Organization"
        />
        <input
          data-testid="org-type-input"
          value={generalForm.organization_type}
          onChange={(e) => onGeneralChange('organization_type', e.target.value)}
          placeholder="Org Type"
        />
        <input
          data-testid="joining-date-input"
          type="date"
          value={generalForm.joining_date}
          onChange={(e) => onGeneralChange('joining_date', e.target.value)}
        />
        <input
          data-testid="role-input"
          value={generalForm.role}
          onChange={(e) => onGeneralChange('role', e.target.value)}
          placeholder="Role"
        />
        <button
          data-testid="save-general-btn"
          onClick={onSave}
          disabled={savingGeneral}
        >
          {savingGeneral ? 'Saving...' : 'Save General'}
        </button>
        {generalChanged && <span data-testid="general-changed">Changed</span>}
      </div>
    );
  };
});

jest.mock('@/components/(profile)/PasswordUpdateSection', () => {
  return function MockPasswordUpdateSection({
    passwordForm,
    passwordStep,
    passwordChanged,
    savingPassword,
    showPasswords,
    onPasswordChange,
    onRequestOTP,
    onVerifyOTP,
    onUpdatePassword,
    onResetFlow,
    onTogglePasswordVisibility
  }) {
    return (
      <div data-testid="password-section">
        <input
          data-testid="password-email-input"
          value={passwordForm.email}
          onChange={(e) => onPasswordChange('email', e.target.value)}
          placeholder="Email"
        />

        {passwordStep === 1 && (
          <button
            data-testid="request-otp-btn"
            onClick={onRequestOTP}
            disabled={savingPassword}
          >
            {savingPassword ? 'Sending...' : 'Request OTP'}
          </button>
        )}

        {passwordStep >= 2 && (
          <div>
            <input
              data-testid="otp-input"
              value={passwordForm.otp}
              onChange={(e) => onPasswordChange('otp', e.target.value)}
              placeholder="OTP"
              maxLength="6"
            />
            <button
              data-testid="verify-otp-btn"
              onClick={onVerifyOTP}
              disabled={savingPassword}
            >
              {savingPassword ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
        )}

        {passwordStep >= 3 && (
          <div>
            <input
              data-testid="new-password-input"
              type={showPasswords.new ? 'text' : 'password'}
              value={passwordForm.newpwd}
              onChange={(e) => onPasswordChange('newpwd', e.target.value)}
              placeholder="New Password"
            />
            <button
              data-testid="toggle-new-pwd-btn"
              onClick={() => onTogglePasswordVisibility('new')}
            >
              Toggle New
            </button>

            <input
              data-testid="confirm-password-input"
              type={showPasswords.confirm ? 'text' : 'password'}
              value={passwordForm.confirmPassword}
              onChange={(e) => onPasswordChange('confirmPassword', e.target.value)}
              placeholder="Confirm Password"
            />
            <button
              data-testid="toggle-confirm-pwd-btn"
              onClick={() => onTogglePasswordVisibility('confirm')}
            >
              Toggle Confirm
            </button>

            <button
              data-testid="update-password-btn"
              onClick={onUpdatePassword}
              disabled={savingPassword}
            >
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        )}

        <button
          data-testid="reset-password-flow-btn"
          onClick={onResetFlow}
        >
          Reset Flow
        </button>

        {passwordChanged && <span data-testid="password-changed">Changed</span>}
      </div>
    );
  };
});

jest.mock('@/components/(profile)/APITokenSection', () => {
  return function MockAPITokenSection({ onGenerateToken }) {
    return (
      <button data-testid="generate-token-btn" onClick={onGenerateToken}>
        Generate Token
      </button>
    );
  };
});

jest.mock('@/components/(profile)/LogoutButton', () => {
  return function MockLogoutButton({ onLogout }) {
    return (
      <button data-testid="logout-btn" onClick={onLogout}>
        Logout
      </button>
    );
  };
});

jest.mock('@/components/(profile)/TokenModal', () => {
  return function MockTokenModal({ onClose }) {
    return (
      <div data-testid="token-modal">
        <button data-testid="close-modal-btn" onClick={onClose}>
          Close
        </button>
      </div>
    );
  };
});

jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    toasts: [],
    showToast: jest.fn(),
    removeToast: jest.fn()
  }),
  ToastContainer: ({ toasts, onRemove }) => (
    <div data-testid="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} data-testid={`toast-${toast.type}`} className={`toast-${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  ),
  Toast: ({ message, type }) => (
    <div data-testid={`toast-${type}`}>{message}</div>
  )
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('ProfilePage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
    window.location.href = '/';
  });

  describe('Profile Loading', () => {
    test('should render loading state initially', () => {
      global.fetch.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<ProfilePage />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    test('should fetch and display profile on mount', async () => {
      const mockProfile = {
        username: 'testuser',
        email: 'test@example.com',
        phone_number: '1234567890',
        address: '123 Main St',
        city: 'Test City',
        pincode: '12345',
        nationality: 'Test Nation',
        birth_date: '2000-01-01T00:00:00Z',
        organization_name: 'Test Org',
        organization_type: 'Company',
        joining_date: '2022-01-01T00:00:00Z',
        role: 'Developer'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: mockProfile })
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/profile');
      expect(screen.getByTestId('profile-avatar')).toBeInTheDocument();
    });

    test('should handle profile fetch error gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Unauthorized' })
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Page should still render even with fetch error
      expect(screen.getByTestId('contact-section')).toBeInTheDocument();
    });
  });

  describe('Contact Information Updates', () => {
    beforeEach(() => {
      const mockProfile = {
        username: 'testuser',
        email: 'test@example.com',
        phone_number: '1234567890',
        address: '123 Main St',
        city: 'Test City',
        pincode: '12345',
        nationality: '',
        birth_date: '',
        organization_name: '',
        organization_type: '',
        joining_date: '',
        role: ''
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: mockProfile })
      });
    });

    test('should update contact form fields', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const phoneInput = screen.getByTestId('phone-input');
      await userEvent.clear(phoneInput);
      await userEvent.type(phoneInput, '9876543210');

      expect(phoneInput.value).toBe('9876543210');
      expect(screen.getByTestId('contact-changed')).toBeInTheDocument();
    });

    test('should save contact information successfully', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const phoneInput = screen.getByTestId('phone-input');
      await userEvent.clear(phoneInput);
      await userEvent.type(phoneInput, '5555555555');

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const mockProfile = {
        username: 'testuser',
        email: 'test@example.com',
        phone_number: '5555555555',
        address: '123 Main St',
        city: 'Test City',
        pincode: '12345'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: mockProfile })
      });

      const saveBtn = screen.getByTestId('save-contact-btn');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/profile',
          expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
          })
        );
      });

      // Verify that the changed flag is cleared after successful save
      await waitFor(() => {
        expect(screen.queryByTestId('contact-changed')).not.toBeInTheDocument();
      });
    });

    test('should handle contact save error with response error', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const phoneInput = screen.getByTestId('phone-input');
      await userEvent.clear(phoneInput);
      await userEvent.type(phoneInput, '2222222222');

      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid phone number' })
      });

      const saveBtn = screen.getByTestId('save-contact-btn');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/profile',
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });

    test('should handle contact save network error', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const phoneInput = screen.getByTestId('phone-input');
      await userEvent.clear(phoneInput);
      await userEvent.type(phoneInput, '3333333333');

      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const saveBtn = screen.getByTestId('save-contact-btn');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/profile',
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });

    test('should handle contact save error', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const phoneInput = screen.getByTestId('phone-input');
      await userEvent.clear(phoneInput);
      await userEvent.type(phoneInput, '1111111111');

      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' })
      });

      const saveBtn = screen.getByTestId('save-contact-btn');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/profile',
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });
  });

  describe('General Information Updates', () => {
    beforeEach(() => {
      const mockProfile = {
        username: 'testuser',
        email: 'test@example.com',
        phone_number: '',
        address: '',
        city: '',
        pincode: '',
        nationality: 'Indian',
        birth_date: '1995-05-15T00:00:00Z',
        organization_name: 'Tech Corp',
        organization_type: 'IT',
        joining_date: '2020-06-01T00:00:00Z',
        role: 'Engineer'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: mockProfile })
      });
    });

    test('should update general form fields', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const nationalityInput = screen.getByTestId('nationality-input');
      await userEvent.clear(nationalityInput);
      await userEvent.type(nationalityInput, 'American');

      expect(nationalityInput.value).toBe('American');
      expect(screen.getByTestId('general-changed')).toBeInTheDocument();
    });

    test('should save general information successfully', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const roleInput = screen.getByTestId('role-input');
      await userEvent.clear(roleInput);
      await userEvent.type(roleInput, 'Manager');

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const mockProfile = {
        username: 'testuser',
        email: 'test@example.com',
        role: 'Manager'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: mockProfile })
      });

      const saveBtn = screen.getByTestId('save-general-btn');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/profile',
          expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
          })
        );
      });

      // Verify that the changed flag is cleared after successful save
      await waitFor(() => {
        expect(screen.queryByTestId('general-changed')).not.toBeInTheDocument();
      });
    });

    test('should handle general information save error with response error', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const roleInput = screen.getByTestId('role-input');
      await userEvent.clear(roleInput);
      await userEvent.type(roleInput, 'Director');

      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid role' })
      });

      const saveBtn = screen.getByTestId('save-general-btn');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/profile',
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });

    test('should handle general information save network error', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const roleInput = screen.getByTestId('role-input');
      await userEvent.clear(roleInput);
      await userEvent.type(roleInput, 'VP');

      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const saveBtn = screen.getByTestId('save-general-btn');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/profile',
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });
  });

  describe('Password Update Flow', () => {
    beforeEach(() => {
      const mockProfile = {
        username: 'testuser',
        email: 'test@example.com',
        phone_number: '',
        address: '',
        city: '',
        pincode: '',
        nationality: '',
        birth_date: '',
        organization_name: '',
        organization_type: '',
        joining_date: '',
        role: ''
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: mockProfile })
      });
    });

    test('should request OTP successfully', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const requestOTPBtn = screen.getByTestId('request-otp-btn');
      fireEvent.click(requestOTPBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/emailcheck',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
        );
      });

      // After requesting OTP, OTP input should appear
      await waitFor(() => {
        expect(screen.getByTestId('otp-input')).toBeInTheDocument();
      });
    });

    test('should handle OTP request error', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Email not found' })
      });

      const requestOTPBtn = screen.getByTestId('request-otp-btn');
      fireEvent.click(requestOTPBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/emailcheck',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    test('should handle OTP request network error', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const requestOTPBtn = screen.getByTestId('request-otp-btn');
      fireEvent.click(requestOTPBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/emailcheck',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    test('should verify OTP successfully', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Request OTP first
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const requestOTPBtn = screen.getByTestId('request-otp-btn');
      fireEvent.click(requestOTPBtn);

      await waitFor(() => {
        expect(screen.getByTestId('otp-input')).toBeInTheDocument();
      });

      // Verify OTP
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const otpInput = screen.getByTestId('otp-input');
      await userEvent.type(otpInput, '123456');

      const verifyOTPBtn = screen.getByTestId('verify-otp-btn');
      fireEvent.click(verifyOTPBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/otpcheck',
          expect.objectContaining({
            method: 'POST'
          })
        );
      });

      // After verifying OTP, password inputs should appear
      await waitFor(() => {
        expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
      });
    });

    test('should handle OTP verify error', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Request OTP first
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const requestOTPBtn = screen.getByTestId('request-otp-btn');
      fireEvent.click(requestOTPBtn);

      await waitFor(() => {
        expect(screen.getByTestId('otp-input')).toBeInTheDocument();
      });

      // Verify OTP with error
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid OTP' })
      });

      const otpInput = screen.getByTestId('otp-input');
      await userEvent.type(otpInput, '999999');

      const verifyOTPBtn = screen.getByTestId('verify-otp-btn');
      fireEvent.click(verifyOTPBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/otpcheck',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    test('should handle OTP verify network error', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Request OTP first
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const requestOTPBtn = screen.getByTestId('request-otp-btn');
      fireEvent.click(requestOTPBtn);

      await waitFor(() => {
        expect(screen.getByTestId('otp-input')).toBeInTheDocument();
      });

      // Verify OTP with network error
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const otpInput = screen.getByTestId('otp-input');
      await userEvent.type(otpInput, '123456');

      const verifyOTPBtn = screen.getByTestId('verify-otp-btn');
      fireEvent.click(verifyOTPBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/otpcheck',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    test('should reject invalid OTP format', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Request OTP first
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const requestOTPBtn = screen.getByTestId('request-otp-btn');
      fireEvent.click(requestOTPBtn);

      await waitFor(() => {
        expect(screen.getByTestId('otp-input')).toBeInTheDocument();
      });

      const otpInput = screen.getByTestId('otp-input');
      await userEvent.type(otpInput, '12345'); // Only 5 digits

      const verifyOTPBtn = screen.getByTestId('verify-otp-btn');
      fireEvent.click(verifyOTPBtn);

      // fetch should not be called with invalid OTP - validation happens before API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2); // Profile fetch + OTP request fetch
      });

      // Verify OTP input is still visible (not cleared)
      expect(screen.getByTestId('otp-input')).toBeInTheDocument();
      
      // Verify that verify OTP API was never called (only the request OTP API was called)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/emailcheck',
        expect.objectContaining({ method: 'POST' })
      );
      expect(global.fetch).not.toHaveBeenCalledWith(
        '/api/auth/otpcheck',
        expect.anything()
      );
    });

    test('should update password successfully', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Request OTP
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      fireEvent.click(screen.getByTestId('request-otp-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('otp-input')).toBeInTheDocument();
      });

      // Verify OTP
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const otpInput = screen.getByTestId('otp-input');
      await userEvent.type(otpInput, '123456');
      fireEvent.click(screen.getByTestId('verify-otp-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
      });

      // Update password
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const newPwdInput = screen.getByTestId('new-password-input');
      const confirmPwdInput = screen.getByTestId('confirm-password-input');

      await userEvent.type(newPwdInput, 'NewPassword123');
      await userEvent.type(confirmPwdInput, 'NewPassword123');

      fireEvent.click(screen.getByTestId('update-password-btn'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/updatepwd',
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });

    test('should handle password update error', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Request OTP
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      fireEvent.click(screen.getByTestId('request-otp-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('otp-input')).toBeInTheDocument();
      });

      // Verify OTP
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const otpInput = screen.getByTestId('otp-input');
      await userEvent.type(otpInput, '123456');
      fireEvent.click(screen.getByTestId('verify-otp-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
      });

      // Update password with error
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Password update failed' })
      });

      const newPwdInput = screen.getByTestId('new-password-input');
      const confirmPwdInput = screen.getByTestId('confirm-password-input');

      await userEvent.type(newPwdInput, 'NewPassword123');
      await userEvent.type(confirmPwdInput, 'NewPassword123');

      fireEvent.click(screen.getByTestId('update-password-btn'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/updatepwd',
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });

    test('should handle password update network error', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Request OTP
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      fireEvent.click(screen.getByTestId('request-otp-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('otp-input')).toBeInTheDocument();
      });

      // Verify OTP
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const otpInput = screen.getByTestId('otp-input');
      await userEvent.type(otpInput, '123456');
      fireEvent.click(screen.getByTestId('verify-otp-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
      });

      // Update password with network error
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const newPwdInput = screen.getByTestId('new-password-input');
      const confirmPwdInput = screen.getByTestId('confirm-password-input');

      await userEvent.type(newPwdInput, 'NewPassword123');
      await userEvent.type(confirmPwdInput, 'NewPassword123');

      fireEvent.click(screen.getByTestId('update-password-btn'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/updatepwd',
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });

    test('should reject mismatched passwords', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Request OTP
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      fireEvent.click(screen.getByTestId('request-otp-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('otp-input')).toBeInTheDocument();
      });

      // Verify OTP
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const otpInput = screen.getByTestId('otp-input');
      await userEvent.type(otpInput, '123456');
      fireEvent.click(screen.getByTestId('verify-otp-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
      });

      const newPwdInput = screen.getByTestId('new-password-input');
      const confirmPwdInput = screen.getByTestId('confirm-password-input');

      await userEvent.type(newPwdInput, 'NewPassword123');
      await userEvent.type(confirmPwdInput, 'DifferentPassword123');

      fireEvent.click(screen.getByTestId('update-password-btn'));

      // Password update should not be called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3); // Profile + OTP request + OTP verify (but NOT updatepwd)
      });
      
      // Verify that update password API was never called
      expect(global.fetch).not.toHaveBeenCalledWith(
        '/api/auth/updatepwd',
        expect.anything()
      );
    });

    test('should reject short passwords', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Request OTP
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      fireEvent.click(screen.getByTestId('request-otp-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('otp-input')).toBeInTheDocument();
      });

      // Verify OTP
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const otpInput = screen.getByTestId('otp-input');
      await userEvent.type(otpInput, '123456');
      fireEvent.click(screen.getByTestId('verify-otp-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
      });

      const newPwdInput = screen.getByTestId('new-password-input');
      const confirmPwdInput = screen.getByTestId('confirm-password-input');

      await userEvent.type(newPwdInput, '123');
      await userEvent.type(confirmPwdInput, '123');

      fireEvent.click(screen.getByTestId('update-password-btn'));

      // Password update should not be called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3); // Profile + OTP request + OTP verify (but NOT updatepwd)
      });
      
      // Verify that update password API was never called
      expect(global.fetch).not.toHaveBeenCalledWith(
        '/api/auth/updatepwd',
        expect.anything()
      );
    });

    test('should reset password flow', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Request OTP
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      fireEvent.click(screen.getByTestId('request-otp-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('otp-input')).toBeInTheDocument();
      });

      // Reset the flow
      fireEvent.click(screen.getByTestId('reset-password-flow-btn'));

      // OTP input should disappear
      await waitFor(() => {
        expect(screen.queryByTestId('otp-input')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('request-otp-btn')).toBeInTheDocument();
    });
  });

  describe('Password Visibility Toggle', () => {
    beforeEach(() => {
      const mockProfile = {
        username: 'testuser',
        email: 'test@example.com',
        phone_number: '',
        address: '',
        city: '',
        pincode: '',
        nationality: '',
        birth_date: '',
        organization_name: '',
        organization_type: '',
        joining_date: '',
        role: ''
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: mockProfile })
      });
    });

    test('should toggle new password visibility', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Request OTP
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      fireEvent.click(screen.getByTestId('request-otp-btn'));

      // Verify OTP
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await waitFor(() => {
        expect(screen.getByTestId('otp-input')).toBeInTheDocument();
      });

      const otpInput = screen.getByTestId('otp-input');
      await userEvent.type(otpInput, '123456');
      fireEvent.click(screen.getByTestId('verify-otp-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
      });

      const newPwdInput = screen.getByTestId('new-password-input');
      expect(newPwdInput.type).toBe('password');

      fireEvent.click(screen.getByTestId('toggle-new-pwd-btn'));

      await waitFor(() => {
        expect(newPwdInput.type).toBe('text');
      });
    });

    test('should toggle confirm password visibility', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Request OTP
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      fireEvent.click(screen.getByTestId('request-otp-btn'));

      // Verify OTP
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await waitFor(() => {
        expect(screen.getByTestId('otp-input')).toBeInTheDocument();
      });

      const otpInput = screen.getByTestId('otp-input');
      await userEvent.type(otpInput, '123456');
      fireEvent.click(screen.getByTestId('verify-otp-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
      });

      const confirmPwdInput = screen.getByTestId('confirm-password-input');
      expect(confirmPwdInput.type).toBe('password');

      fireEvent.click(screen.getByTestId('toggle-confirm-pwd-btn'));

      await waitFor(() => {
        expect(confirmPwdInput.type).toBe('text');
      });
    });
  });

  describe('API Token Section', () => {
    beforeEach(() => {
      const mockProfile = {
        username: 'testuser',
        email: 'test@example.com',
        phone_number: '',
        address: '',
        city: '',
        pincode: '',
        nationality: '',
        birth_date: '',
        organization_name: '',
        organization_type: '',
        joining_date: '',
        role: ''
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: mockProfile })
      });
    });

    test('should show token modal when generate token is clicked', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.queryByTestId('token-modal')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('generate-token-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('token-modal')).toBeInTheDocument();
      });
    });

    test('should close token modal', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('generate-token-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('token-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('close-modal-btn'));

      await waitFor(() => {
        expect(screen.queryByTestId('token-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Logout Functionality', () => {
    beforeEach(() => {
      const mockProfile = {
        username: 'testuser',
        email: 'test@example.com',
        phone_number: '',
        address: '',
        city: '',
        pincode: '',
        nationality: '',
        birth_date: '',
        organization_name: '',
        organization_type: '',
        joining_date: '',
        role: ''
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: mockProfile })
      });
    });

    test('should logout successfully', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      fireEvent.click(screen.getByTestId('logout-btn'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/logout',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include'
          })
        );
      });
    });

    test('should handle logout error gracefully', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      fireEvent.click(screen.getByTestId('logout-btn'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/logout',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include'
          })
        );
      });
    });
  });

  describe('Date Parsing', () => {
    test('should correctly parse ISO date strings', async () => {
      const mockProfile = {
        username: 'testuser',
        email: 'test@example.com',
        phone_number: '',
        address: '',
        city: '',
        pincode: '',
        nationality: '',
        birth_date: '2000-05-15T10:30:00Z',
        organization_name: '',
        organization_type: '',
        joining_date: '2022-06-01T14:20:00Z',
        role: ''
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: mockProfile })
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const birthDateInput = screen.getByTestId('birth-date-input');
      const joiningDateInput = screen.getByTestId('joining-date-input');

      expect(birthDateInput.value).toBe('2000-05-15');
      expect(joiningDateInput.value).toBe('2022-06-01');
    });
  });

  describe('Form Change Tracking', () => {
    beforeEach(() => {
      const mockProfile = {
        username: 'testuser',
        email: 'test@example.com',
        phone_number: '1234567890',
        address: '123 Main St',
        city: 'Test City',
        pincode: '12345',
        nationality: 'Indian',
        birth_date: '2000-01-01T00:00:00Z',
        organization_name: 'Tech Corp',
        organization_type: 'IT',
        joining_date: '2020-01-01T00:00:00Z',
        role: 'Engineer'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: mockProfile })
      });
    });

    test('should track contact form changes', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.queryByTestId('contact-changed')).not.toBeInTheDocument();

      const phoneInput = screen.getByTestId('phone-input');
      await userEvent.clear(phoneInput);
      await userEvent.type(phoneInput, '9999999999');

      expect(screen.getByTestId('contact-changed')).toBeInTheDocument();
    });

    test('should track general form changes', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.queryByTestId('general-changed')).not.toBeInTheDocument();

      const roleInput = screen.getByTestId('role-input');
      await userEvent.clear(roleInput);
      await userEvent.type(roleInput, 'Manager');

      expect(screen.getByTestId('general-changed')).toBeInTheDocument();
    });

    test('should not track password field changes as password changes', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const passwordEmailInput = screen.getByTestId('password-email-input');
      await userEvent.clear(passwordEmailInput);
      await userEvent.type(passwordEmailInput, 'newemail@example.com');

      // Email field change in password section should not set passwordChanged flag
      expect(screen.queryByTestId('password-changed')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Save Operations', () => {
    beforeEach(() => {
      const mockProfile = {
        username: 'testuser',
        email: 'test@example.com',
        phone_number: '1234567890',
        address: '123 Main St',
        city: 'Test City',
        pincode: '12345',
        nationality: 'Indian',
        birth_date: '2000-01-01T00:00:00Z',
        organization_name: 'Tech Corp',
        organization_type: 'IT',
        joining_date: '2020-01-01T00:00:00Z',
        role: 'Engineer'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: mockProfile })
      });
    });

    test('should save contact and general info independently', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Modify contact
      const phoneInput = screen.getByTestId('phone-input');
      await userEvent.clear(phoneInput);
      await userEvent.type(phoneInput, '5555555555');

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          profile: {
            phone_number: '5555555555',
            username: 'testuser',
            email: 'test@example.com'
          }
        })
      });

      fireEvent.click(screen.getByTestId('save-contact-btn'));

      await waitFor(() => {
        expect(screen.queryByTestId('contact-changed')).not.toBeInTheDocument();
      });

      // Modify general
      const roleInput = screen.getByTestId('role-input');
      await userEvent.clear(roleInput);
      await userEvent.type(roleInput, 'Senior Engineer');

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          profile: {
            role: 'Senior Engineer',
            username: 'testuser',
            email: 'test@example.com'
          }
        })
      });

      fireEvent.click(screen.getByTestId('save-general-btn'));

      await waitFor(() => {
        expect(screen.queryByTestId('general-changed')).not.toBeInTheDocument();
      });

      // Should have made 5 API calls: initial fetch, contact save, contact refetch, general save, general refetch
      expect(global.fetch).toHaveBeenCalledTimes(5);
    });
  });
});
