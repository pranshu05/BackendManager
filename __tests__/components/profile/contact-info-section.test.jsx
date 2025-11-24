import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactInfoSection from '@/components/(profile)/ContactInfoSection';

describe('ContactInfoSection Component', () => {
  const mockOnContactChange = jest.fn();
  const mockOnSave = jest.fn();

  const defaultProps = {
    contactForm: {
      phone_number: '1234567890',
      address: '123 Main St',
      city: 'Test City',
      pincode: '12345'
    },
    contactChanged: false,
    savingContact: false,
    onContactChange: mockOnContactChange,
    onSave: mockOnSave
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render contact information section', () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      expect(screen.getByText('Contact Information')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /contact information/i })).toBeInTheDocument();
    });

    test('should render all input fields with correct labels', () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/pin code/i)).toBeInTheDocument();
    });

    test('should display form values correctly', () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      expect(screen.getByLabelText(/phone number/i).value).toBe('1234567890');
      expect(screen.getByLabelText(/city/i).value).toBe('Test City');
      expect(screen.getByLabelText(/address/i).value).toBe('123 Main St');
      expect(screen.getByLabelText(/pin code/i).value).toBe('12345');
    });

    test('should render with empty form fields', () => {
      const emptyProps = {
        ...defaultProps,
        contactForm: {
          phone_number: '',
          address: '',
          city: '',
          pincode: ''
        }
      };

      render(<ContactInfoSection {...emptyProps} />);
      
      expect(screen.getByLabelText(/phone number/i).value).toBe('');
      expect(screen.getByLabelText(/city/i).value).toBe('');
      expect(screen.getByLabelText(/address/i).value).toBe('');
      expect(screen.getByLabelText(/pin code/i).value).toBe('');
    });
  });

  describe('Save Button Visibility', () => {
    test('should not show save button when no changes', () => {
      render(<ContactInfoSection {...defaultProps} contactChanged={false} />);
      
      expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
    });

    test('should show save button when changes detected', () => {
      render(<ContactInfoSection {...defaultProps} contactChanged={true} />);
      
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    test('should show "Saving..." text when saving', () => {
      render(
        <ContactInfoSection 
          {...defaultProps} 
          contactChanged={true}
          savingContact={true}
        />
      );
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    test('should show "Save Changes" text when not saving', () => {
      render(
        <ContactInfoSection 
          {...defaultProps} 
          contactChanged={true}
          savingContact={false}
        />
      );
      
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('should call onContactChange when phone number is updated', async () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      const phoneInput = screen.getByLabelText(/phone number/i);
      fireEvent.change(phoneInput, { target: { value: '9876543210' } });
      
      expect(mockOnContactChange).toHaveBeenCalledWith('phone_number', '9876543210');
    });

    test('should call onContactChange when city is updated', async () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      const cityInput = screen.getByLabelText(/city/i);
      fireEvent.change(cityInput, { target: { value: 'New City' } });
      
      expect(mockOnContactChange).toHaveBeenCalledWith('city', 'New City');
    });

    test('should call onContactChange when address is updated', async () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      const addressInput = screen.getByLabelText(/address/i);
      fireEvent.change(addressInput, { target: { value: '456 Oak Ave' } });
      
      expect(mockOnContactChange).toHaveBeenCalledWith('address', '456 Oak Ave');
    });

    test('should call onContactChange when pin code is updated', async () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      const pincodeInput = screen.getByLabelText(/pin code/i);
      fireEvent.change(pincodeInput, { target: { value: '54321' } });
      
      expect(mockOnContactChange).toHaveBeenCalledWith('pincode', '54321');
    });

    test('should call onSave when save button is clicked', () => {
      render(
        <ContactInfoSection 
          {...defaultProps} 
          contactChanged={true}
        />
      );
      
      const saveBtn = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveBtn);
      
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    test('should disable save button when saving', () => {
      render(
        <ContactInfoSection 
          {...defaultProps} 
          contactChanged={true}
          savingContact={true}
        />
      );
      
      const saveBtn = screen.getByRole('button', { name: /saving/i });
      expect(saveBtn).toBeDisabled();
    });

    test('should enable save button when not saving', () => {
      render(
        <ContactInfoSection 
          {...defaultProps} 
          contactChanged={true}
          savingContact={false}
        />
      );
      
      const saveBtn = screen.getByRole('button', { name: /save changes/i });
      expect(saveBtn).not.toBeDisabled();
    });
  });

  describe('Input Field Properties', () => {
    test('phone input should have tel type', () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      const phoneInput = screen.getByLabelText(/phone number/i);
      expect(phoneInput.type).toBe('tel');
    });

    test('city input should have text type', () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      const cityInput = screen.getByLabelText(/city/i);
      expect(cityInput.type).toBe('text');
    });

    test('address input should have text type', () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      const addressInput = screen.getByLabelText(/address/i);
      expect(addressInput.type).toBe('text');
    });

    test('pincode input should have text type', () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      const pincodeInput = screen.getByLabelText(/pin code/i);
      expect(pincodeInput.type).toBe('text');
    });

    test('all inputs should have placeholder text', () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      expect(screen.getByPlaceholderText(/enter phone number/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter city/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter address/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter pin code/i)).toBeInTheDocument();
    });
  });

  describe('Multiple Field Updates', () => {
    test('should handle multiple field updates sequentially', async () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      const phoneInput = screen.getByLabelText(/phone number/i);
      const cityInput = screen.getByLabelText(/city/i);
      
      fireEvent.change(phoneInput, { target: { value: '5555555555' } });
      fireEvent.change(cityInput, { target: { value: 'Updated City' } });
      
      expect(mockOnContactChange).toHaveBeenCalledWith('phone_number', '5555555555');
      expect(mockOnContactChange).toHaveBeenCalledWith('city', 'Updated City');
    });

    test('should handle rapid field changes', async () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      const phoneInput = screen.getByLabelText(/phone number/i);
      
      fireEvent.change(phoneInput, { target: { value: '1111111111' } });
      
      expect(mockOnContactChange).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long phone number', async () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      const phoneInput = screen.getByLabelText(/phone number/i);
      const longPhone = '12345678901234567890';
      
      fireEvent.change(phoneInput, { target: { value: longPhone } });
      
      expect(mockOnContactChange).toHaveBeenCalledWith('phone_number', longPhone);
    });

    test('should handle very long address', async () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      const addressInput = screen.getByLabelText(/address/i);
      const longAddress = '123 Very Long Street Name With Many Words That Goes On And On';
      
      fireEvent.change(addressInput, { target: { value: longAddress } });
      
      expect(mockOnContactChange).toHaveBeenCalledWith('address', longAddress);
    });

    test('should handle special characters in fields', async () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      const addressInput = screen.getByLabelText(/address/i);
      const addressWithSpecialChars = '123 Main St, Apt #456 (Near Park)';
      
      fireEvent.change(addressInput, { target: { value: addressWithSpecialChars } });
      
      expect(mockOnContactChange).toHaveBeenCalledWith('address', addressWithSpecialChars);
    });

    test('should handle numeric input in text fields', async () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      const cityInput = screen.getByLabelText(/city/i);
      
      fireEvent.change(cityInput, { target: { value: '123 City 456' } });
      
      expect(mockOnContactChange).toHaveBeenCalledWith('city', '123 City 456');
    });
  });

  describe('Form State Management', () => {
    test('should reflect prop changes in inputs', () => {
      const { rerender } = render(<ContactInfoSection {...defaultProps} />);
      
      const updatedProps = {
        ...defaultProps,
        contactForm: {
          phone_number: '9999999999',
          address: '789 New St',
          city: 'Another City',
          pincode: '67890'
        }
      };
      
      rerender(<ContactInfoSection {...updatedProps} />);
      
      expect(screen.getByLabelText(/phone number/i).value).toBe('9999999999');
      expect(screen.getByLabelText(/address/i).value).toBe('789 New St');
      expect(screen.getByLabelText(/city/i).value).toBe('Another City');
      expect(screen.getByLabelText(/pin code/i).value).toBe('67890');
    });

    test('should toggle save button based on contactChanged prop', () => {
      const { rerender } = render(
        <ContactInfoSection {...defaultProps} contactChanged={false} />
      );
      
      expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
      
      rerender(
        <ContactInfoSection {...defaultProps} contactChanged={true} />
      );
      
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('all inputs should be properly labeled', () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      const phoneInput = screen.getByLabelText(/phone number/i);
      const cityInput = screen.getByLabelText(/city/i);
      const addressInput = screen.getByLabelText(/address/i);
      const pincodeInput = screen.getByLabelText(/pin code/i);
      
      expect(phoneInput).toBeInTheDocument();
      expect(cityInput).toBeInTheDocument();
      expect(addressInput).toBeInTheDocument();
      expect(pincodeInput).toBeInTheDocument();
    });

    test('save button should have appropriate aria label', () => {
      render(
        <ContactInfoSection 
          {...defaultProps} 
          contactChanged={true}
        />
      );
      
      const saveBtn = screen.getByRole('button', { name: /save changes/i });
      expect(saveBtn).toBeInTheDocument();
    });

    test('inputs should be focusable', () => {
      render(<ContactInfoSection {...defaultProps} />);
      
      const phoneInput = screen.getByLabelText(/phone number/i);
      phoneInput.focus();
      
      expect(phoneInput).toHaveFocus();
    });
  });
});
