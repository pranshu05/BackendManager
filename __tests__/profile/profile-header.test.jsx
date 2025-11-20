import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProfileHeader from '@/components/(profile)/ProfileHeader';

describe('ProfileHeader Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render header component', () => {
      const { container } = render(<ProfileHeader />);
      expect(container.querySelector('header')).toBeInTheDocument();
    });

    test('should display DBuddy title', () => {
      render(<ProfileHeader />);
      expect(screen.getByText('DBuddy')).toBeInTheDocument();
    });

    test('should display subtitle', () => {
      render(<ProfileHeader />);
      expect(screen.getByText('Your Database Companion')).toBeInTheDocument();
    });

    test('should render Database icon', () => {
      const { container } = render(<ProfileHeader />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    test('should render both title and subtitle', () => {
      render(<ProfileHeader />);
      expect(screen.getByText('DBuddy')).toBeInTheDocument();
      expect(screen.getByText('Your Database Companion')).toBeInTheDocument();
    });

    test('should render close button', () => {
      render(<ProfileHeader />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Layout and Structure', () => {
    test('should have flex layout', () => {
      const { container } = render(<ProfileHeader />);
      const header = container.querySelector('header');
      expect(header).toHaveClass('flex');
    });

    test('should have space between items', () => {
      const { container } = render(<ProfileHeader />);
      const header = container.querySelector('header');
      expect(header).toHaveClass('justify-between');
    });

    test('should center items vertically', () => {
      const { container } = render(<ProfileHeader />);
      const header = container.querySelector('header');
      expect(header).toHaveClass('items-center');
    });

    test('should have bottom margin', () => {
      const { container } = render(<ProfileHeader />);
      const header = container.querySelector('header');
      expect(header).toHaveClass('mb-8');
    });

    test('should have left section with flex layout', () => {
      const { container } = render(<ProfileHeader />);
      const leftSection = container.querySelector('.flex.items-center.space-x-2');
      expect(leftSection).toBeInTheDocument();
    });

    test('should have spacing between logo and text', () => {
      const { container } = render(<ProfileHeader />);
      const leftSection = container.querySelector('.space-x-2');
      expect(leftSection).toBeInTheDocument();
    });
  });

  describe('Logo and Branding', () => {
    test('should render logo container', () => {
      const { container } = render(<ProfileHeader />);
      const logoContainer = container.querySelector('.p-2.bg-\\[\\#1e4a8a\\]');
      expect(logoContainer).toBeInTheDocument();
    });

    test('should have correct logo background color', () => {
      const { container } = render(<ProfileHeader />);
      const logoContainer = container.querySelector('.bg-\\[\\#1e4a8a\\]');
      expect(logoContainer).toHaveClass('bg-[#1e4a8a]');
    });

    test('should have rounded logo container', () => {
      const { container } = render(<ProfileHeader />);
      const logoContainer = container.querySelector('.rounded-xl');
      expect(logoContainer).toBeInTheDocument();
    });

    test('should have padding on logo container', () => {
      const { container } = render(<ProfileHeader />);
      const logoContainer = container.querySelector('.p-2');
      expect(logoContainer).toBeInTheDocument();
    });

    test('should render database icon inside logo', () => {
      const { container } = render(<ProfileHeader />);
      const logoContainer = container.querySelector('.p-2.bg-\\[\\#1e4a8a\\]');
      const icon = logoContainer.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    test('should have white icon color', () => {
      const { container } = render(<ProfileHeader />);
      const icon = container.querySelector('.text-white');
      expect(icon).toBeInTheDocument();
    });

    test('should have correct icon dimensions', () => {
      const { container } = render(<ProfileHeader />);
      const icon = container.querySelector('.w-6.h-6');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Title and Subtitle', () => {
    test('should have large font for title', () => {
      const { container } = render(<ProfileHeader />);
      const title = screen.getByText('DBuddy');
      expect(title).toHaveClass('text-2xl');
    });

    test('should have bold font for title', () => {
      const { container } = render(<ProfileHeader />);
      const title = screen.getByText('DBuddy');
      expect(title).toHaveClass('font-bold');
    });

    test('should have primary color for title', () => {
      const { container } = render(<ProfileHeader />);
      const title = screen.getByText('DBuddy');
      expect(title).toHaveClass('text-[#1e4a8a]');
    });

    test('should have small font for subtitle', () => {
      const { container } = render(<ProfileHeader />);
      const subtitle = screen.getByText('Your Database Companion');
      expect(subtitle).toHaveClass('text-sm');
    });

    test('should have primary color for subtitle', () => {
      const { container } = render(<ProfileHeader />);
      const subtitle = screen.getByText('Your Database Companion');
      expect(subtitle).toHaveClass('text-[#1e4a8a]');
    });

    test('should have text wrapper div', () => {
      const { container } = render(<ProfileHeader />);
      const textWrapper = container.querySelector('.flex.items-center.space-x-2 > div:last-child');
      expect(textWrapper).toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    test('should render close button with aria-label', () => {
      render(<ProfileHeader />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });

    test('should have correct aria-label', () => {
      render(<ProfileHeader />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close');
    });

    test('should have rounded button styling', () => {
      const { container } = render(<ProfileHeader />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveClass('rounded-full');
    });

    test('should have padding on close button', () => {
      const { container } = render(<ProfileHeader />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveClass('p-2');
    });

    test('should have primary color for icon', () => {
      const { container } = render(<ProfileHeader />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveClass('text-[#1e4a8a]');
    });

    test('should have hover effect', () => {
      const { container } = render(<ProfileHeader />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveClass('hover:bg-gray-500/10');
    });

    test('should have transition effect', () => {
      const { container } = render(<ProfileHeader />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveClass('transition-colors');
    });

    test('should have correct icon size', () => {
      const { container } = render(<ProfileHeader />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      const icon = closeButton.querySelector('.w-6.h-6');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Button Click Behavior', () => {
    test('should handle close button click', () => {
      render(<ProfileHeader />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      
      expect(() => fireEvent.click(closeButton)).not.toThrow();
    });

    test('should be clickable element', () => {
      render(<ProfileHeader />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      
      expect(closeButton).toBeEnabled();
      expect(closeButton).not.toBeDisabled();
    });

    test('should handle multiple clicks', () => {
      render(<ProfileHeader />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      
      expect(() => {
        fireEvent.click(closeButton);
        fireEvent.click(closeButton);
        fireEvent.click(closeButton);
      }).not.toThrow();
    });
  });;

  describe('Accessibility', () => {
    test('should have semantic header element', () => {
      const { container } = render(<ProfileHeader />);
      const header = container.querySelector('header');
      expect(header.tagName).toBe('HEADER');
    });

    test('should have button role for close button', () => {
      render(<ProfileHeader />);
      const closeButton = screen.getByRole('button');
      expect(closeButton).toBeInTheDocument();
    });

    test('should have descriptive aria-label for close button', () => {
      render(<ProfileHeader />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveAttribute('aria-label');
    });

    test('should have visible text content', () => {
      render(<ProfileHeader />);
      expect(screen.getByText('DBuddy')).toBeVisible();
      expect(screen.getByText('Your Database Companion')).toBeVisible();
    });

    test('should have keyboard accessible close button', () => {
      render(<ProfileHeader />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      
      closeButton.focus();
      expect(closeButton).toHaveFocus();
    });

    test('should have sufficient color contrast for title', () => {
      const { container } = render(<ProfileHeader />);
      const title = screen.getByText('DBuddy');
      expect(title).toHaveClass('text-[#1e4a8a]');
    });

    test('should have sufficient color contrast for subtitle', () => {
      const { container } = render(<ProfileHeader />);
      const subtitle = screen.getByText('Your Database Companion');
      expect(subtitle).toHaveClass('text-[#1e4a8a]');
    });
  });

  describe('CSS Classes', () => {
    test('should have all required header classes', () => {
      const { container } = render(<ProfileHeader />);
      const header = container.querySelector('header');
      expect(header).toHaveClass('flex', 'items-center', 'justify-between', 'mb-8');
    });

    test('should have all required left section classes', () => {
      const { container } = render(<ProfileHeader />);
      const leftSection = container.querySelector('.flex.items-center.space-x-2');
      expect(leftSection).toHaveClass('flex', 'items-center', 'space-x-2');
    });

    test('should have all required logo classes', () => {
      const { container } = render(<ProfileHeader />);
      const logo = container.querySelector('.p-2.bg-\\[\\#1e4a8a\\].rounded-xl');
      expect(logo).toHaveClass('p-2', 'bg-[#1e4a8a]', 'rounded-xl');
    });

    test('should have all required button classes', () => {
      const { container } = render(<ProfileHeader />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveClass('p-2', 'rounded-full', 'text-[#1e4a8a]');
    });
  });

  describe('Branding and Visual Consistency', () => {
    test('should use consistent primary color throughout', () => {
      const { container } = render(<ProfileHeader />);
      
      // Logo background
      expect(container.querySelector('.bg-\\[\\#1e4a8a\\]')).toBeInTheDocument();
      
      // Title color
      expect(screen.getByText('DBuddy')).toHaveClass('text-[#1e4a8a]');
      
      // Subtitle color
      expect(screen.getByText('Your Database Companion')).toHaveClass('text-[#1e4a8a]');
      
      // Close button color
      expect(screen.getByRole('button')).toHaveClass('text-[#1e4a8a]');
    });

    test('should display DBuddy branding prominently', () => {
      render(<ProfileHeader />);
      const title = screen.getByText('DBuddy');
      
      expect(title).toBeVisible();
      expect(title).toHaveClass('text-2xl', 'font-bold');
    });

    test('should show tagline clearly', () => {
      render(<ProfileHeader />);
      const tagline = screen.getByText('Your Database Companion');
      
      expect(tagline).toBeVisible();
      expect(tagline).toHaveClass('text-sm');
    });

    test('should maintain branding spacing', () => {
      const { container } = render(<ProfileHeader />);
      const header = container.querySelector('header');
      
      expect(header).toHaveClass('mb-8');
      expect(container.querySelector('.space-x-2')).toBeInTheDocument();
    });
  });

  describe('Icon Elements', () => {
    test('should render exactly two icons (database and close)', () => {
      const { container } = render(<ProfileHeader />);
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBe(2);
    });

    test('should have database icon in logo', () => {
      const { container } = render(<ProfileHeader />);
      const logoIcon = container.querySelector('.p-2.bg-\\[\\#1e4a8a\\] svg');
      expect(logoIcon).toBeInTheDocument();
    });

    test('should have close icon in button', () => {
      const { container } = render(<ProfileHeader />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      const closeIcon = closeButton.querySelector('svg');
      expect(closeIcon).toBeInTheDocument();
    });

    test('should have white database icon', () => {
      const { container } = render(<ProfileHeader />);
      const logoContainer = container.querySelector('.p-2.bg-\\[\\#1e4a8a\\]');
      const icon = logoContainer.querySelector('.text-white');
      expect(icon).toBeInTheDocument();
    });

    test('should have primary colored close icon', () => {
      const { container } = render(<ProfileHeader />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveClass('text-[#1e4a8a]');
    });
  });

  describe('Component Integration', () => {
    test('should render complete header with all elements', () => {
      render(<ProfileHeader />);
      
      // Logo section
      expect(screen.getByText('DBuddy')).toBeInTheDocument();
      
      // Tagline
      expect(screen.getByText('Your Database Companion')).toBeInTheDocument();
      
      // Close button
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    test('should maintain proper structure', () => {
      const { container } = render(<ProfileHeader />);
      
      const header = container.querySelector('header');
      const leftSection = container.querySelector('.flex.items-center.space-x-2');
      const closeButton = screen.getByRole('button', { name: /close/i });
      
      expect(header).toBeInTheDocument();
      expect(leftSection).toBeInTheDocument();
      expect(closeButton).toBeInTheDocument();
    });

    test('should have proper element hierarchy', () => {
      const { container } = render(<ProfileHeader />);
      
      const header = container.querySelector('header');
      const children = header.children;
      
      expect(children.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Responsive Behavior', () => {
    test('should maintain layout in flexbox', () => {
      const { container } = render(<ProfileHeader />);
      const header = container.querySelector('header');
      
      expect(header).toHaveClass('flex');
      expect(header).toHaveClass('justify-between');
    });

    test('should have consistent spacing', () => {
      const { container } = render(<ProfileHeader />);
      
      expect(container.querySelector('.space-x-2')).toBeInTheDocument();
      expect(container.querySelector('.mb-8')).toBeInTheDocument();
    });
  });

  describe('Text Content', () => {
    test('should display exact branding text', () => {
      render(<ProfileHeader />);
      
      expect(screen.getByText('DBuddy')).toHaveTextContent('DBuddy');
      expect(screen.getByText('Your Database Companion')).toHaveTextContent('Your Database Companion');
    });

    test('should have proper text case', () => {
      render(<ProfileHeader />);
      
      const title = screen.getByText('DBuddy');
      expect(title.textContent).toBe('DBuddy');
    });
  });

  describe('Edge Cases', () => {
    test('should remain visible after initial render', () => {
      render(<ProfileHeader />);
      
      const title = screen.getByText('DBuddy');
      const subtitle = screen.getByText('Your Database Companion');
      const button = screen.getByRole('button', { name: /close/i });
      
      expect(title).toBeInTheDocument();
      expect(subtitle).toBeInTheDocument();
      expect(button).toBeInTheDocument();
    });
  });

  describe('Button States', () => {
    test('should have enabled close button', () => {
      render(<ProfileHeader />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      
      expect(closeButton).not.toBeDisabled();
    });

    test('should be interactive', () => {
      render(<ProfileHeader />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      
      expect(closeButton).toBeEnabled();
    });
  });
});
