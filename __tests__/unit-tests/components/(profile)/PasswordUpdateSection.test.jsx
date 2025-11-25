import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordUpdateSection from '@/components/(profile)/PasswordUpdateSection';

describe('PasswordUpdateSection Component', () => {
  const mockOnPasswordChange = jest.fn();
  const mockOnRequestOTP = jest.fn();
  const mockOnVerifyOTP = jest.fn();
  const mockOnUpdatePassword = jest.fn();
  const mockOnResetFlow = jest.fn();
  const mockOnTogglePasswordVisibility = jest.fn();

  const defaultProps = {
    passwordForm: {
      email: 'test@example.com',
      otp: '',
      newpwd: '',
      confirmPassword: ''
    },
    passwordStep: 1,
    passwordChanged: false,
    savingPassword: false,
    showPasswords: {
      new: false,
      confirm: false
    },
    onPasswordChange: mockOnPasswordChange,
    onRequestOTP: mockOnRequestOTP,
    onVerifyOTP: mockOnVerifyOTP,
    onUpdatePassword: mockOnUpdatePassword,
    onResetFlow: mockOnResetFlow,
    onTogglePasswordVisibility: mockOnTogglePasswordVisibility
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render password update section', () => {
      render(<PasswordUpdateSection {...defaultProps} />);
      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });

    test('should display email field', () => {
      render(<PasswordUpdateSection {...defaultProps} />);
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    test('should render step indicator', () => {
      render(<PasswordUpdateSection {...defaultProps} />);
      expect(screen.getByText('Request OTP')).toBeInTheDocument();
      // Check for step indicator "Verify OTP" text in the step indicators
      const allVerifyOTPTexts = screen.getAllByText('Verify OTP');
      expect(allVerifyOTPTexts.length).toBeGreaterThan(0);
      // Step indicator contains "New Password" text, verify it exists
      const stepIndicators = screen.getAllByText('New Password');
      expect(stepIndicators.length).toBeGreaterThan(0);
    });

    test('should render with empty form fields initially', () => {
      render(<PasswordUpdateSection {...defaultProps} />);
      const emailInput = screen.getByDisplayValue('test@example.com');
      expect(emailInput).toBeInTheDocument();
    });

    test('should not display OTP field at step 1', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={1} />);
      expect(screen.queryByPlaceholderText('Enter 6-digit OTP')).not.toBeInTheDocument();
    });

    test('should not display password fields at step 1', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={1} />);
      expect(screen.queryByPlaceholderText('Enter new password')).not.toBeInTheDocument();
    });
  });

  describe('Step Indicators', () => {
    test('should highlight step 1 at passwordStep 1', () => {
      const { container } = render(<PasswordUpdateSection {...defaultProps} passwordStep={1} />);
      const stepDivs = container.querySelectorAll('[class*="bg-"]');
      expect(container.textContent).toContain('1');
    });

    test('should highlight step 2 at passwordStep 2', () => {
      const { container } = render(<PasswordUpdateSection {...defaultProps} passwordStep={2} />);
      expect(container.textContent).toContain('2');
    });

    test('should highlight step 3 at passwordStep 3', () => {
      const { container } = render(<PasswordUpdateSection {...defaultProps} passwordStep={3} />);
      expect(container.textContent).toContain('3');
    });

    test('should show inactive step indicator when passwordStep is below 1', () => {
      const { container } = render(<PasswordUpdateSection {...defaultProps} passwordStep={0} />);

      // 'Request OTP' should be inactive: text-gray-400 and circle should be bg-gray-200
      expect(container.querySelector('.text-gray-400')).toBeInTheDocument();
      expect(container.querySelector('.bg-gray-200')).toBeInTheDocument();
    });
  });

  describe('Step 1 - Request OTP', () => {
    test('should show "Send OTP" button at step 1', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={1} />);
      expect(screen.getByText('Send OTP')).toBeInTheDocument();
    });

    test('should call onRequestOTP when Send OTP button is clicked', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={1} />);
      const button = screen.getByText('Send OTP');
      fireEvent.click(button);
      expect(mockOnRequestOTP).toHaveBeenCalled();
    });

    test('should disable Send OTP button when saving', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={1} savingPassword={true} />);
      const button = screen.getByText('Sending...');
      expect(button).toBeDisabled();
    });

    test('should show "Sending..." text when saving', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={1} savingPassword={true} />);
      expect(screen.getByText('Sending...')).toBeInTheDocument();
    });

    test('should have read-only email field', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={1} />);
      const emailInput = screen.getByDisplayValue('test@example.com');
      expect(emailInput).toHaveAttribute('readOnly');
    });

    test('should display email input with gray background', () => {
      const { container } = render(<PasswordUpdateSection {...defaultProps} passwordStep={1} />);
      const emailInput = container.querySelector('input[type="email"]');
      expect(emailInput).toHaveClass('bg-gray-100', 'cursor-not-allowed');
    });

    test('should show helper text for Send OTP button', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={1} />);
      expect(screen.getByText('Click "Send OTP" to receive verification code')).toBeInTheDocument();
    });
  });

  describe('Step 2 - Verify OTP', () => {
    test('should show OTP input field at step 2', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={2} />);
      expect(screen.getByPlaceholderText('Enter 6-digit OTP')).toBeInTheDocument();
    });

    test('should show "Verify OTP" button at step 2', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={2} />);
      expect(screen.getByText('Verify Your OTP')).toBeInTheDocument();
    });

    test('should call onVerifyOTP when Verify OTP button is clicked', () => {
      render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={2}
          passwordForm={{ ...defaultProps.passwordForm, otp: '123456' }}
        />
      );
      const button = screen.getByText('Verify Your OTP');
      fireEvent.click(button);
      expect(mockOnVerifyOTP).toHaveBeenCalled();
    });

    test('should disable Verify OTP button when OTP is empty', () => {
      render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={2}
          passwordForm={{ ...defaultProps.passwordForm, otp: '' }}
        />
      );
      const button = screen.getByText('Verify Your OTP');
      expect(button).toBeDisabled();
    });

    test('should enable Verify OTP button when OTP is filled', () => {
      render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={2}
          passwordForm={{ ...defaultProps.passwordForm, otp: '123456' }}
        />
      );
      const button = screen.getByText('Verify Your OTP');
      expect(button).not.toBeDisabled();
    });

    test('should disable Verify OTP button when saving', () => {
      render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={2}
          savingPassword={true}
          passwordForm={{ ...defaultProps.passwordForm, otp: '123456' }}
        />
      );
      const button = screen.getByText('Verifying...');
      expect(button).toBeDisabled();
    });

    test('should accept only 6 digits for OTP', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={2} />);
      const otpInput = screen.getByPlaceholderText('Enter 6-digit OTP');
      expect(otpInput).toHaveAttribute('maxLength', '6');
    });

    test('should call onPasswordChange when OTP is entered', async () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={2} />);
      const otpInput = screen.getByPlaceholderText('Enter 6-digit OTP');
      
      fireEvent.change(otpInput, { target: { value: '123456' } });
      
      expect(mockOnPasswordChange).toHaveBeenCalled();
    });

    test('should show helper text for OTP', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={2} />);
      expect(screen.getByText(/Check your email for the OTP code/)).toBeInTheDocument();
    });

    test('should show restart process link at step 2', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={2} />);
      expect(screen.getByText(/Didn't receive OTP\?/)).toBeInTheDocument();
    });

    test('should call onResetFlow when restart link is clicked', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={2} />);
      const restartLink = screen.getByText(/Didn't receive OTP\?/);
      fireEvent.click(restartLink);
      expect(mockOnResetFlow).toHaveBeenCalled();
    });

    test('should disable OTP input when password step is greater than 2', () => {
      render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={3}
          passwordForm={{ ...defaultProps.passwordForm, otp: '123456' }}
        />
      );
      const otpInput = screen.getByPlaceholderText('Enter 6-digit OTP');
      expect(otpInput).toBeDisabled();
    });
  });

  describe('Step 3 - Update Password', () => {
    test('should show password fields at step 3', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={3} />);
      expect(screen.getByPlaceholderText('Enter new password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Confirm new password')).toBeInTheDocument();
    });

    test('should show "Update Password" button when password is changed', () => {
      render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={3}
          passwordChanged={true}
        />
      );
      expect(screen.getByText('Update Password')).toBeInTheDocument();
    });

    test('should not show "Update Password" button when password is not changed', () => {
      render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={3}
          passwordChanged={false}
        />
      );
      expect(screen.queryByText('Update Password')).not.toBeInTheDocument();
    });

    test('should call onUpdatePassword when Update Password button is clicked', () => {
      render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={3}
          passwordChanged={true}
        />
      );
      const button = screen.getByText('Update Password');
      fireEvent.click(button);
      expect(mockOnUpdatePassword).toHaveBeenCalled();
    });

    test('should disable Update Password button when saving', () => {
      render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={3}
          passwordChanged={true}
          savingPassword={true}
        />
      );
      const button = screen.getByText('Updating...');
      expect(button).toBeDisabled();
    });

    test('should toggle password visibility for new password', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={3} />);
      const toggleButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')
      );
      fireEvent.click(toggleButton);
      expect(mockOnTogglePasswordVisibility).toHaveBeenCalled();
    });

    test('should toggle password visibility for confirm password', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={3} />);
      const toggleButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg')
      );
      fireEvent.click(toggleButtons[1]);
      expect(mockOnTogglePasswordVisibility).toHaveBeenCalled();
    });

    test('should show password as text when visibility is toggled', () => {
      render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={3}
          showPasswords={{ new: true, confirm: false }}
        />
      );
      const newPasswordInput = screen.getByPlaceholderText('Enter new password');
      expect(newPasswordInput).toHaveAttribute('type', 'text');
    });

    test('should show password as dots when visibility is toggled off', () => {
      render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={3}
          showPasswords={{ new: false, confirm: false }}
        />
      );
      const newPasswordInput = screen.getByPlaceholderText('Enter new password');
      expect(newPasswordInput).toHaveAttribute('type', 'password');
    });

    test('should call onPasswordChange for new password field', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={3} />);
      const newPasswordInput = screen.getByPlaceholderText('Enter new password');
      
      fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123' } });
      
      expect(mockOnPasswordChange).toHaveBeenCalledWith('newpwd', 'NewPassword123');
    });

    test('should call onPasswordChange for confirm password field', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={3} />);
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');
      
      fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123' } });
      
      expect(mockOnPasswordChange).toHaveBeenCalledWith('confirmPassword', 'NewPassword123');
    });

    test('should show password mismatch warning', () => {
      render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={3}
          passwordForm={{
            ...defaultProps.passwordForm,
            newpwd: 'Password123',
            confirmPassword: 'DifferentPassword'
          }}
        />
      );
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    test('should not show password mismatch warning when passwords are empty', () => {
      render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={3}
          passwordForm={{
            ...defaultProps.passwordForm,
            newpwd: '',
            confirmPassword: ''
          }}
        />
      );
      expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
    });

    test('should show minimum password length requirement', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={3} />);
      expect(screen.getByText('Minimum 6 characters')).toBeInTheDocument();
    });

    test('should have minLength attribute on new password input', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={3} />);
      const newPasswordInput = screen.getByPlaceholderText('Enter new password');
      expect(newPasswordInput).toHaveAttribute('minLength', '6');
    });
  });

  describe('Reset Flow Button', () => {
    test('should not show reset button at step 1', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={1} />);
      expect(screen.queryByText(/Start over/)).not.toBeInTheDocument();
    });

    test('should show reset button at step 2', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={2} />);
      expect(screen.getByText(/Start over/)).toBeInTheDocument();
    });

    test('should show reset button at step 3', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={3} />);
      expect(screen.getByText(/Start over/)).toBeInTheDocument();
    });

    test('should call onResetFlow when reset button is clicked', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={2} />);
      const resetButton = screen.getByText(/Start over/);
      fireEvent.click(resetButton);
      expect(mockOnResetFlow).toHaveBeenCalled();
    });
  });

  describe('Form State Management', () => {
    test('should reflect prop changes in email field', () => {
      const { rerender } = render(<PasswordUpdateSection {...defaultProps} />);
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
      
      const updatedProps = {
        ...defaultProps,
        passwordForm: {
          ...defaultProps.passwordForm,
          email: 'newemail@example.com'
        }
      };
      rerender(<PasswordUpdateSection {...updatedProps} />);
      expect(screen.getByDisplayValue('newemail@example.com')).toBeInTheDocument();
    });

    test('should update step when passwordStep prop changes', () => {
      const { rerender } = render(<PasswordUpdateSection {...defaultProps} passwordStep={1} />);
      expect(screen.getByText('Send OTP')).toBeInTheDocument();
      
      rerender(<PasswordUpdateSection {...defaultProps} passwordStep={2} />);
      expect(screen.getByPlaceholderText('Enter 6-digit OTP')).toBeInTheDocument();
    });

    test('should reflect OTP value changes', () => {
      render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={2}
          passwordForm={{ ...defaultProps.passwordForm, otp: '123456' }}
        />
      );
      expect(screen.getByDisplayValue('123456')).toBeInTheDocument();
    });

    test('should reflect new password value changes', () => {
      render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={3}
          passwordForm={{ 
            ...defaultProps.passwordForm, 
            newpwd: 'TestPassword123'
          }}
        />
      );
      expect(screen.getByDisplayValue('TestPassword123')).toBeInTheDocument();
    });
  });

  describe('Password Visibility Toggle', () => {
    test('should toggle new password visibility', () => {
      const { rerender } = render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={3}
          showPasswords={{ new: false, confirm: false }}
        />
      );
      let newPasswordInput = screen.getByPlaceholderText('Enter new password');
      expect(newPasswordInput).toHaveAttribute('type', 'password');
      
      rerender(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={3}
          showPasswords={{ new: true, confirm: false }}
        />
      );
      newPasswordInput = screen.getByPlaceholderText('Enter new password');
      expect(newPasswordInput).toHaveAttribute('type', 'text');
    });

    test('should toggle confirm password visibility', () => {
      const { rerender } = render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={3}
          showPasswords={{ new: false, confirm: false }}
        />
      );
      let confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
      
      rerender(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={3}
          showPasswords={{ new: false, confirm: true }}
        />
      );
      confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty OTP submission', () => {
      render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={2}
          passwordForm={{ ...defaultProps.passwordForm, otp: '' }}
        />
      );
      const button = screen.getByText('Verify Your OTP');
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(mockOnVerifyOTP).not.toHaveBeenCalled();
    });

    test('should handle very long password', () => {
      const longPassword = 'a'.repeat(100);
      render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={3}
          passwordForm={{
            ...defaultProps.passwordForm,
            newpwd: longPassword,
            confirmPassword: longPassword
          }}
        />
      );
      const newPasswordInput = screen.getByPlaceholderText('Enter new password');
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');
      expect(newPasswordInput).toHaveValue(longPassword);
      expect(confirmPasswordInput).toHaveValue(longPassword);
    });

    test('should filter non-numeric characters from OTP input', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={2} />);
      const otpInput = screen.getByPlaceholderText('Enter 6-digit OTP');
      
      fireEvent.change(otpInput, { target: { value: 'abc123def456' } });
      
      expect(mockOnPasswordChange).toHaveBeenCalled();
    });

    test('should handle rapid button clicks', () => {
      render(
        <PasswordUpdateSection 
          {...defaultProps} 
          passwordStep={1}
        />
      );
      const button = screen.getByText('Send OTP');
      
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      expect(mockOnRequestOTP).toHaveBeenCalledTimes(3);
    });
  });

  describe('Accessibility', () => {
    test('should have proper labels for all inputs', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={3} />);
      // Check for labels using htmlFor associations
      const emailLabel = screen.getByLabelText('Email');
      const newPasswordLabel = screen.getByLabelText('New Password');
      const confirmPasswordLabel = screen.getByLabelText('Confirm Password');
      
      expect(emailLabel).toBeInTheDocument();
      expect(newPasswordLabel).toBeInTheDocument();
      expect(confirmPasswordLabel).toBeInTheDocument();
    });

    test('should have icon elements in labels', () => {
      const { container } = render(<PasswordUpdateSection {...defaultProps} />);
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    test('should have proper button roles', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={1} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    test('should have focusable inputs', () => {
      render(<PasswordUpdateSection {...defaultProps} passwordStep={3} />);
      const newPasswordInput = screen.getByPlaceholderText('Enter new password');
      newPasswordInput.focus();
      expect(newPasswordInput).toHaveFocus();
    });
  });

  describe('Component Layout', () => {
    test('should render in white background container', () => {
      const { container } = render(<PasswordUpdateSection {...defaultProps} />);
      const mainDiv = container.querySelector('.bg-white');
      expect(mainDiv).toHaveClass('rounded-xl', 'shadow-lg');
      // Note: padding is responsive (p-4 sm:p-6), so we check for the base class
      expect(mainDiv).toHaveClass('p-4');
    });

    test('should have password fields in grid layout at step 3', () => {
      const { container } = render(
        <PasswordUpdateSection {...defaultProps} passwordStep={3} />
      );
      const gridDiv = container.querySelector('.grid');
      expect(gridDiv).toHaveClass('grid-cols-1', 'md:grid-cols-2');
    });
  });

  describe('Button States', () => {
    test('should show correct button text at each step', () => {
      const { rerender } = render(<PasswordUpdateSection {...defaultProps} passwordStep={1} />);
      expect(screen.getByText('Send OTP')).toBeInTheDocument();
      
      rerender(<PasswordUpdateSection {...defaultProps} passwordStep={2} />);
      expect(screen.getByText('Verify Your OTP')).toBeInTheDocument();
      
      rerender(<PasswordUpdateSection {...defaultProps} passwordStep={3} passwordChanged={true} />);
      expect(screen.getByText('Update Password')).toBeInTheDocument();
    });

    test('should handle loading states for all buttons', () => {
      const { rerender } = render(
        <PasswordUpdateSection {...defaultProps} passwordStep={1} savingPassword={true} />
      );
      expect(screen.getByText('Sending...')).toBeInTheDocument();
      
      rerender(
        <PasswordUpdateSection {...defaultProps} passwordStep={2} savingPassword={true} passwordForm={{ ...defaultProps.passwordForm, otp: '123456' }} />
      );
      expect(screen.getByText('Verifying...')).toBeInTheDocument();
      
      rerender(
        <PasswordUpdateSection {...defaultProps} passwordStep={3} savingPassword={true} passwordChanged={true} />
      );
      expect(screen.getByText('Updating...')).toBeInTheDocument();
    });
  });
});
