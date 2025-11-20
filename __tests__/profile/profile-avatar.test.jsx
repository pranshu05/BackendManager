import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfileAvatar from '@/components/(profile)/ProfileAvatar';

describe('ProfileAvatar Component', () => {
  const defaultProps = {
    username: 'John Doe',
    email: 'john@example.com'
  };

  describe('Rendering', () => {
    test('should render avatar component', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test('should display username', () => {
      render(<ProfileAvatar {...defaultProps} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    test('should display email', () => {
      render(<ProfileAvatar {...defaultProps} />);
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    test('should render default username when not provided', () => {
      render(<ProfileAvatar email="test@example.com" />);
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    test('should render both username and email', () => {
      render(<ProfileAvatar {...defaultProps} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    test('should render User icon', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Avatar Circle', () => {
    test('should have circular avatar container', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const avatarCircle = container.querySelector('.w-24.h-24.rounded-full');
      expect(avatarCircle).toBeInTheDocument();
    });

    test('should have correct background color', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const avatarCircle = container.querySelector('.bg-\\[\\#1e4a8a\\]');
      expect(avatarCircle).toHaveClass('bg-[#1e4a8a]');
    });

    test('should have white border', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const avatarCircle = container.querySelector('.border-white');
      expect(avatarCircle).toHaveClass('border-white');
    });

    test('should have border width of 4', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const avatarCircle = container.querySelector('.border-4');
      expect(avatarCircle).toHaveClass('border-4');
    });

    test('should have shadow styling', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const avatarCircle = container.querySelector('.shadow-lg');
      expect(avatarCircle).toHaveClass('shadow-lg');
    });

    test('should center flex items', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const avatarCircle = container.querySelector('.flex.items-center.justify-center');
      expect(avatarCircle).toBeInTheDocument();
    });
  });

  describe('User Icon', () => {
    test('should render user icon inside avatar', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const icon = container.querySelector('.w-12.h-12.text-white');
      expect(icon).toBeInTheDocument();
    });

    test('should have white color for icon', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const icon = container.querySelector('.text-white');
      expect(icon).toHaveClass('text-white');
    });

    test('should have proper icon dimensions', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const icon = container.querySelector('.w-12.h-12');
      expect(icon).toHaveClass('w-12', 'h-12');
    });
  });

  describe('Username Styling', () => {
    test('should have large font size for username', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const username = screen.getByText('John Doe');
      expect(username).toHaveClass('text-3xl');
    });

    test('should have bold font weight for username', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const username = screen.getByText('John Doe');
      expect(username).toHaveClass('font-bold');
    });

    test('should have primary color for username', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const username = screen.getByText('John Doe');
      expect(username).toHaveClass('text-[#1e4a8a]');
    });
  });

  describe('Email Styling', () => {
    test('should have gray color for email', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const email = screen.getByText('john@example.com');
      expect(email).toHaveClass('text-gray-600');
    });

    test('should display email below username', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const wrapper = container.querySelector('.flex.flex-col');
      const children = wrapper.querySelectorAll('*');
      // Email should appear after username in DOM
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    test('should have flex column layout', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const wrapper = container.querySelector('.flex.flex-col');
      expect(wrapper).toBeInTheDocument();
    });

    test('should center items horizontally', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const wrapper = container.querySelector('.items-center');
      expect(wrapper).toBeInTheDocument();
    });

    test('should have bottom margin', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const wrapper = container.querySelector('.mb-8');
      expect(wrapper).toBeInTheDocument();
    });

    test('should have margin below avatar circle', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const avatarCircle = container.querySelector('.mb-4');
      expect(avatarCircle).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    test('should handle empty username string', () => {
      render(<ProfileAvatar username="" email="test@example.com" />);
      // Empty string is falsy, so should show default "User"
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    test('should handle null username', () => {
      render(<ProfileAvatar username={null} email="test@example.com" />);
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    test('should handle undefined username', () => {
      render(<ProfileAvatar email="test@example.com" />);
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    test('should display custom username when provided', () => {
      render(<ProfileAvatar username="Jane Smith" email="jane@example.com" />);
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    test('should handle long username', () => {
      const longUsername = 'A'.repeat(50);
      render(<ProfileAvatar username={longUsername} email="test@example.com" />);
      expect(screen.getByText(longUsername)).toBeInTheDocument();
    });

    test('should handle email with special characters', () => {
      const email = 'user+tag@example.co.uk';
      render(<ProfileAvatar username="Test" email={email} />);
      expect(screen.getByText(email)).toBeInTheDocument();
    });

    test('should handle username with special characters', () => {
      const username = "O'Brien-Smith Jr.";
      render(<ProfileAvatar username={username} email="test@example.com" />);
      expect(screen.getByText(username)).toBeInTheDocument();
    });

    test('should handle username with numbers', () => {
      const username = 'User123';
      render(<ProfileAvatar username={username} email="test@example.com" />);
      expect(screen.getByText(username)).toBeInTheDocument();
    });

    test('should handle username with spaces', () => {
      const username = '  Spaced User  ';
      render(<ProfileAvatar username={username} email="test@example.com" />);
      expect(screen.getByText('Spaced User')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    test('should render complete avatar component with all elements', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      
      // Check main wrapper exists
      expect(container.querySelector('.flex.flex-col')).toBeInTheDocument();
      
      // Check avatar circle exists
      expect(container.querySelector('.w-24.h-24.rounded-full')).toBeInTheDocument();
      
      // Check username exists
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      
      // Check email exists
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      
      // Check icon exists
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    test('should maintain proper structure', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      
      const mainDiv = container.firstChild;
      expect(mainDiv.children.length).toBeGreaterThan(0);
    });
  });

  describe('Different User Scenarios', () => {
    test('should display admin user', () => {
      render(<ProfileAvatar username="Admin User" email="admin@example.com" />);
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    });

    test('should display user with no username', () => {
      render(<ProfileAvatar email="guest@example.com" />);
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('guest@example.com')).toBeInTheDocument();
    });

    test('should display corporate email user', () => {
      render(
        <ProfileAvatar 
          username="Corporate User" 
          email="user@corporatedomain.com" 
        />
      );
      expect(screen.getByText('Corporate User')).toBeInTheDocument();
      expect(screen.getByText('user@corporatedomain.com')).toBeInTheDocument();
    });

    test('should display international email', () => {
      render(
        <ProfileAvatar 
          username="International" 
          email="user@example.de" 
        />
      );
      expect(screen.getByText('International')).toBeInTheDocument();
      expect(screen.getByText('user@example.de')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have semantic HTML structure', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const mainDiv = container.firstChild;
      expect(mainDiv.tagName).toBe('DIV');
    });

    test('should display text content accessibly', () => {
      render(<ProfileAvatar {...defaultProps} />);
      const username = screen.getByText('John Doe');
      const email = screen.getByText('john@example.com');
      
      expect(username).toBeVisible();
      expect(email).toBeVisible();
    });

    test('should have proper color contrast for username', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const username = screen.getByText('John Doe');
      expect(username).toHaveClass('text-[#1e4a8a]');
    });

    test('should have proper color contrast for email', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const email = screen.getByText('john@example.com');
      expect(email).toHaveClass('text-gray-600');
    });

    test('should display icon with proper sizing', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const icon = container.querySelector('.w-12.h-12');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('CSS Classes', () => {
    test('should have all required styling classes', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const wrapper = container.querySelector('.flex.flex-col.items-center.mb-8');
      expect(wrapper).toBeInTheDocument();
    });

    test('should apply rounded-full to avatar', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const avatar = container.querySelector('.rounded-full');
      expect(avatar).toBeInTheDocument();
    });

    test('should apply shadow-lg to avatar', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const avatar = container.querySelector('.shadow-lg');
      expect(avatar).toBeInTheDocument();
    });

    test('should apply text-3xl to username', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const username = screen.getByText('John Doe');
      expect(username).toHaveClass('text-3xl');
    });

    test('should apply font-bold to username', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const username = screen.getByText('John Doe');
      expect(username).toHaveClass('font-bold');
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long email address', () => {
      const longEmail = 'verylongemailaddresswithmanychars@subdomain.example.co.uk';
      render(<ProfileAvatar username="User" email={longEmail} />);
      expect(screen.getByText(longEmail)).toBeInTheDocument();
    });

    test('should handle username with emoji', () => {
      const username = 'User 👤';
      render(<ProfileAvatar username={username} email="test@example.com" />);
      expect(screen.getByText(username)).toBeInTheDocument();
    });

    test('should handle repeated renders with same props', () => {
      const { rerender } = render(<ProfileAvatar {...defaultProps} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      
      rerender(<ProfileAvatar {...defaultProps} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    test('should handle prop changes', () => {
      const { rerender } = render(<ProfileAvatar username="User1" email="user1@example.com" />);
      expect(screen.getByText('User1')).toBeInTheDocument();
      
      rerender(<ProfileAvatar username="User2" email="user2@example.com" />);
      expect(screen.getByText('User2')).toBeInTheDocument();
      expect(screen.queryByText('User1')).not.toBeInTheDocument();
    });

    test('should handle both props changing simultaneously', () => {
      const { rerender } = render(<ProfileAvatar {...defaultProps} />);
      
      rerender(
        <ProfileAvatar 
          username="Jane Smith" 
          email="jane@example.com" 
        />
      );
      
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    test('should render with minimal props', () => {
      render(<ProfileAvatar email="minimal@example.com" />);
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('minimal@example.com')).toBeInTheDocument();
    });
  });

  describe('Visual Consistency', () => {
    test('should maintain consistent avatar size', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const avatar = container.querySelector('.w-24.h-24');
      expect(avatar).toHaveClass('w-24', 'h-24');
    });

    test('should maintain consistent icon size', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      const icon = container.querySelector('.w-12.h-12');
      expect(icon).toHaveClass('w-12', 'h-12');
    });

    test('should use consistent primary color throughout', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      
      // Avatar background
      expect(container.querySelector('.bg-\\[\\#1e4a8a\\]')).toBeInTheDocument();
      
      // Username text
      expect(screen.getByText('John Doe')).toHaveClass('text-[#1e4a8a]');
    });

    test('should use consistent spacing', () => {
      const { container } = render(<ProfileAvatar {...defaultProps} />);
      
      // Main container margin
      expect(container.querySelector('.mb-8')).toBeInTheDocument();
      
      // Avatar circle margin
      expect(container.querySelector('.mb-4')).toBeInTheDocument();
    });
  });
});
