import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GeneralInfoSection from '@/components/(profile)/GeneralInfoSection';

describe('GeneralInfoSection Component', () => {
  const mockOnGeneralChange = jest.fn();
  const mockOnSave = jest.fn();

  const defaultProps = {
    generalForm: {
      nationality: 'Indian',
      birth_date: '1995-05-15',
      organization_name: 'Tech Corp',
      organization_type: 'Corporate',
      joining_date: '2020-06-01',
      role: 'Developer'
    },
    generalChanged: false,
    savingGeneral: false,
    onGeneralChange: mockOnGeneralChange,
    onSave: mockOnSave
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render general information section', () => {
      render(<GeneralInfoSection {...defaultProps} />);
      expect(screen.getByText('General Information')).toBeInTheDocument();
    });

    test('should render all input fields with correct labels', () => {
      render(<GeneralInfoSection {...defaultProps} />);
      expect(screen.getByDisplayValue('Indian')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1995-05-15')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Tech Corp')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2020-06-01')).toBeInTheDocument();
    });

    test('should display form values correctly', () => {
      render(<GeneralInfoSection {...defaultProps} />);
      expect(screen.getByDisplayValue('Indian')).toHaveValue('Indian');
      expect(screen.getByDisplayValue('Tech Corp')).toHaveValue('Tech Corp');
    });

    test('should render with empty form fields', () => {
      const emptyProps = {
        ...defaultProps,
        generalForm: {
          nationality: '',
          birth_date: '',
          organization_name: '',
          organization_type: '',
          joining_date: '',
          role: ''
        }
      };
      render(<GeneralInfoSection {...emptyProps} />);
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input.value).toBe('');
      });
    });

    test('should render all selects for organization type and role', () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBe(2); // organization_type and role
    });
  });

  describe('Save Button Visibility', () => {
    test('should not show save button when no changes', () => {
      render(<GeneralInfoSection {...defaultProps} generalChanged={false} />);
      expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
    });

    test('should show save button when changes detected', () => {
      render(<GeneralInfoSection {...defaultProps} generalChanged={true} />);
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    test('should show "Saving..." text when saving', () => {
      render(<GeneralInfoSection {...defaultProps} generalChanged={true} savingGeneral={true} />);
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    test('should show "Save Changes" text when not saving', () => {
      render(<GeneralInfoSection {...defaultProps} generalChanged={true} savingGeneral={false} />);
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('should call onGeneralChange when nationality is updated', async () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const nationalityInput = screen.getByDisplayValue('Indian');
      
      fireEvent.change(nationalityInput, { target: { value: 'American' } });
      
      expect(mockOnGeneralChange).toHaveBeenCalledWith('nationality', 'American');
    });

    test('should call onGeneralChange when birth date is updated', async () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const birthDateInput = screen.getByDisplayValue('1995-05-15');
      
      fireEvent.change(birthDateInput, { target: { value: '2000-01-01' } });
      
      expect(mockOnGeneralChange).toHaveBeenCalledWith('birth_date', '2000-01-01');
    });

    test('should call onGeneralChange when organization name is updated', async () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const orgNameInput = screen.getByDisplayValue('Tech Corp');
      
      fireEvent.change(orgNameInput, { target: { value: 'New Company' } });
      
      expect(mockOnGeneralChange).toHaveBeenCalledWith('organization_name', 'New Company');
    });

    test('should call onGeneralChange when organization type is changed', () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const orgTypeSelect = screen.getByDisplayValue('Corporate');
      
      fireEvent.change(orgTypeSelect, { target: { value: 'Startup' } });
      
      expect(mockOnGeneralChange).toHaveBeenCalledWith('organization_type', 'Startup');
    });

    test('should call onGeneralChange when joining date is updated', () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const joiningDateInput = screen.getByDisplayValue('2020-06-01');
      
      fireEvent.change(joiningDateInput, { target: { value: '2022-01-01' } });
      
      expect(mockOnGeneralChange).toHaveBeenCalledWith('joining_date', '2022-01-01');
    });

    test('should call onGeneralChange when role is changed', () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const roleSelect = screen.getByDisplayValue('Developer');
      
      fireEvent.change(roleSelect, { target: { value: 'Manager' } });
      
      expect(mockOnGeneralChange).toHaveBeenCalledWith('role', 'Manager');
    });

    test('should call onSave when save button is clicked', () => {
      render(<GeneralInfoSection {...defaultProps} generalChanged={true} />);
      const saveBtn = screen.getByText('Save Changes');
      fireEvent.click(saveBtn);
      expect(mockOnSave).toHaveBeenCalled();
    });

    test('should disable save button when saving', () => {
      render(<GeneralInfoSection {...defaultProps} generalChanged={true} savingGeneral={true} />);
      const saveBtn = screen.getByText('Saving...');
      expect(saveBtn).toBeDisabled();
    });

    test('should enable save button when not saving', () => {
      render(<GeneralInfoSection {...defaultProps} generalChanged={true} savingGeneral={false} />);
      const saveBtn = screen.getByText('Save Changes');
      expect(saveBtn).not.toBeDisabled();
    });
  });

  describe('Input Field Properties', () => {
    test('nationality input should have text type', () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const nationalityInput = screen.getByDisplayValue('Indian');
      expect(nationalityInput).toHaveAttribute('type', 'text');
    });

    test('birth date input should have date type', () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const birthDateInput = screen.getByDisplayValue('1995-05-15');
      expect(birthDateInput).toHaveAttribute('type', 'date');
    });

    test('organization name input should have text type', () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const orgNameInput = screen.getByDisplayValue('Tech Corp');
      expect(orgNameInput).toHaveAttribute('type', 'text');
    });

    test('joining date input should have date type', () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const joiningDateInput = screen.getByDisplayValue('2020-06-01');
      expect(joiningDateInput).toHaveAttribute('type', 'date');
    });

    test('all text inputs should have placeholder text', () => {
      render(<GeneralInfoSection {...defaultProps} />);
      expect(screen.getByPlaceholderText('Enter nationality')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter organization name')).toBeInTheDocument();
    });

    test('organization type select should have correct options', () => {
      render(<GeneralInfoSection {...defaultProps} />);
      expect(screen.getByRole('option', { name: 'Corporate' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Startup' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Educational' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Government' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Non-Profit' })).toBeInTheDocument();
    });

    test('role select should have correct options', () => {
      render(<GeneralInfoSection {...defaultProps} />);
      expect(screen.getByRole('option', { name: 'Student' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Teacher' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Developer' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Manager' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument();
    });
  });

  describe('Multiple Field Updates', () => {
    test('should handle multiple field updates sequentially', async () => {
      render(<GeneralInfoSection {...defaultProps} />);
      
      const nationalityInput = screen.getByDisplayValue('Indian');
      const orgNameInput = screen.getByDisplayValue('Tech Corp');
      
      fireEvent.change(nationalityInput, { target: { value: 'Canadian' } });
      fireEvent.change(orgNameInput, { target: { value: 'New Org' } });
      
      expect(mockOnGeneralChange).toHaveBeenCalledWith('nationality', 'Canadian');
      expect(mockOnGeneralChange).toHaveBeenCalledWith('organization_name', 'New Org');
    });

    test('should handle rapid select changes', async () => {
      render(<GeneralInfoSection {...defaultProps} />);
      
      const orgTypeSelect = screen.getByDisplayValue('Corporate');
      const roleSelect = screen.getByDisplayValue('Developer');
      
      fireEvent.change(orgTypeSelect, { target: { value: 'Startup' } });
      fireEvent.change(roleSelect, { target: { value: 'Manager' } });
      
      expect(mockOnGeneralChange).toHaveBeenCalledWith('organization_type', 'Startup');
      expect(mockOnGeneralChange).toHaveBeenCalledWith('role', 'Manager');
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long nationality name', async () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const nationalityInput = screen.getByDisplayValue('Indian');
      
      const longNationality = 'A'.repeat(100);
      fireEvent.change(nationalityInput, { target: { value: longNationality } });
      
      expect(mockOnGeneralChange).toHaveBeenCalledWith('nationality', longNationality);
    });

    test('should handle very long organization name', async () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const orgNameInput = screen.getByDisplayValue('Tech Corp');
      
      const longOrgName = 'B'.repeat(100);
      fireEvent.change(orgNameInput, { target: { value: longOrgName } });
      
      expect(mockOnGeneralChange).toHaveBeenCalledWith('organization_name', longOrgName);
    });

    test('should handle special characters in text fields', async () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const nationalityInput = screen.getByDisplayValue('Indian');
      
      const specialChars = '!@#$%^&*()_+-=';
      fireEvent.change(nationalityInput, { target: { value: specialChars } });
      
      expect(mockOnGeneralChange).toHaveBeenCalledWith('nationality', specialChars);
    });

    test('should handle numeric input in text fields', async () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const nationalityInput = screen.getByDisplayValue('Indian');
      
      fireEvent.change(nationalityInput, { target: { value: '12345' } });
      
      expect(mockOnGeneralChange).toHaveBeenCalledWith('nationality', '12345');
    });

    test('should handle empty select options', () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const orgTypeSelect = screen.getByDisplayValue('Corporate');
      
      fireEvent.change(orgTypeSelect, { target: { value: '' } });
      
      expect(mockOnGeneralChange).toHaveBeenCalledWith('organization_type', '');
    });
  });

  describe('Form State Management', () => {
    test('should reflect prop changes in inputs', () => {
      const { rerender } = render(<GeneralInfoSection {...defaultProps} />);
      expect(screen.getByDisplayValue('Indian')).toBeInTheDocument();
      
      const updatedProps = {
        ...defaultProps,
        generalForm: {
          ...defaultProps.generalForm,
          nationality: 'American'
        }
      };
      
      rerender(<GeneralInfoSection {...updatedProps} />);
      expect(screen.getByDisplayValue('American')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Indian')).not.toBeInTheDocument();
    });

    test('should toggle save button based on generalChanged prop', () => {
      const { rerender } = render(<GeneralInfoSection {...defaultProps} generalChanged={false} />);
      expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
      
      rerender(<GeneralInfoSection {...defaultProps} generalChanged={true} />);
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    test('should update all select values when props change', () => {
      const { rerender } = render(<GeneralInfoSection {...defaultProps} />);
      expect(screen.getByDisplayValue('Corporate')).toHaveValue('Corporate');
      expect(screen.getByDisplayValue('Developer')).toHaveValue('Developer');
      
      const updatedProps = {
        ...defaultProps,
        generalForm: {
          ...defaultProps.generalForm,
          organization_type: 'Educational',
          role: 'Teacher'
        }
      };
      
      rerender(<GeneralInfoSection {...updatedProps} />);
      expect(screen.getByDisplayValue('Educational')).toHaveValue('Educational');
      expect(screen.getByDisplayValue('Teacher')).toHaveValue('Teacher');
    });
  });

  describe('Accessibility', () => {
    test('should have proper label associations', () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const labels = screen.getAllByText(/Nationality|Birth Date|Organization|Role|Joining/);
      expect(labels.length).toBeGreaterThan(0);
    });

    test('should have icon elements in labels', () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const section = screen.getByText('General Information').closest('div');
      expect(section).toBeInTheDocument();
    });

    test('inputs should be keyboard accessible', async () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const nationalityInput = screen.getByDisplayValue('Indian');
      
      nationalityInput.focus();
      expect(nationalityInput).toHaveFocus();
      
      await userEvent.type(nationalityInput, 'Test');
      expect(mockOnGeneralChange).toHaveBeenCalled();
    });

    test('selects should be keyboard accessible', () => {
      render(<GeneralInfoSection {...defaultProps} />);
      const orgTypeSelect = screen.getByDisplayValue('Corporate');
      
      orgTypeSelect.focus();
      expect(orgTypeSelect).toHaveFocus();
    });
  });

  describe('Component Layout', () => {
    test('should render in a grid layout', () => {
      const { container } = render(<GeneralInfoSection {...defaultProps} />);
      const gridDiv = container.querySelector('.grid');
      expect(gridDiv).toBeInTheDocument();
    });

    test('should apply correct styling classes', () => {
      const { container } = render(<GeneralInfoSection {...defaultProps} />);
      const section = container.querySelector('.bg-white');
      expect(section).toHaveClass('rounded-xl', 'shadow-lg', 'p-6');
    });
  });
});
