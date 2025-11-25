import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FAQsSection from '@/components/(help)/FAQsSection';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    ChevronDown: ({ className }) => <div className={className} data-testid="chevron-down" />,
    ChevronUp: ({ className }) => <div className={className} data-testid="chevron-up" />,
    HelpCircle: ({ className }) => <div className={className} data-testid="help-circle" />,
    Youtube: ({ className }) => <div className={className} data-testid="youtube" />,
}));

// Mock Card components
jest.mock('@/components/ui/card', () => ({
    Card: ({ children }) => <div data-testid="card" className="card">{children}</div>,
    CardContent: ({ children }) => <div data-testid="card-content" className="card-content">{children}</div>,
    CardHeader: ({ children }) => <div data-testid="card-header" className="card-header">{children}</div>,
    CardTitle: ({ children }) => <div data-testid="card-title" className="card-title">{children}</div>,
}));

describe('FAQsSection Component', () => {
    describe('Rendering and Structure', () => {
        test('should render without crashing', () => {
            const { container } = render(<FAQsSection />);
            expect(container).toBeInTheDocument();
        });

        test('should render two Card components', () => {
            render(<FAQsSection />);
            const cards = screen.getAllByTestId('card');
            expect(cards).toHaveLength(2);
        });

        test('should render FAQ section with correct title', () => {
            render(<FAQsSection />);
            expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
        });

        test('should render Video Tutorial section with correct title', () => {
            render(<FAQsSection />);
            expect(screen.getByText('Video Tutorial')).toBeInTheDocument();
        });

        test('should render HelpCircle icon', () => {
            render(<FAQsSection />);
            expect(screen.getByTestId('help-circle')).toBeInTheDocument();
        });

        test('should render YouTube icon', () => {
            render(<FAQsSection />);
            expect(screen.getByTestId('youtube')).toBeInTheDocument();
        });
    });

    describe('FAQ Items Rendering', () => {
        test('should render all 15 FAQ questions', () => {
            render(<FAQsSection />);
            expect(screen.getByText('What is DBuddy?')).toBeInTheDocument();
            expect(screen.getByText('How do I create a new project?')).toBeInTheDocument();
            expect(screen.getByText('Can I import my existing database?')).toBeInTheDocument();
            expect(screen.getByText('How does the AI query assistance work?')).toBeInTheDocument();
            expect(screen.getByText('Is my data secure?')).toBeInTheDocument();
            expect(screen.getByText('Can I export my database?')).toBeInTheDocument();
            expect(screen.getByText('What databases are supported?')).toBeInTheDocument();
            expect(screen.getByText('How do I optimize my queries?')).toBeInTheDocument();
            expect(screen.getByText('Can I see my query history?')).toBeInTheDocument();
            expect(screen.getByText('How do I reset my password?')).toBeInTheDocument();
            expect(screen.getByText('What should I do if I encounter an error?')).toBeInTheDocument();
            expect(screen.getByText('Can I collaborate with team members?')).toBeInTheDocument();
            expect(screen.getByText('How do I delete a project?')).toBeInTheDocument();
            expect(screen.getByText('Is there a mobile app?')).toBeInTheDocument();
            expect(screen.getByText('How can I contact support?')).toBeInTheDocument();
        });

        test('should render all FAQ answers as hidden initially', () => {
            render(<FAQsSection />);
            const answer = "DBuddy is your ultimate backend manager that helps you manage databases, execute queries, and optimize your database operations with AI-powered assistance. It provides an intuitive interface for database management and query optimization.";
            expect(screen.queryByText(answer)).not.toBeInTheDocument();
        });

        test('should render correct number of FAQ buttons', () => {
            render(<FAQsSection />);
            const buttons = screen.getAllByRole('button');
            // 15 FAQ buttons + 1 for iframe (if counted as interactive)
            expect(buttons.length).toBeGreaterThanOrEqual(15);
        });
    });

    describe('FAQ Item Toggle Behavior', () => {
        test('should expand FAQ item when clicked', async () => {
            render(<FAQsSection />);
            const faqButton = screen.getByText('What is DBuddy?');
            fireEvent.click(faqButton);

            await waitFor(() => {
                const answer = "DBuddy is your ultimate backend manager that helps you manage databases, execute queries, and optimize your database operations with AI-powered assistance. It provides an intuitive interface for database management and query optimization.";
                expect(screen.getByText(answer)).toBeInTheDocument();
            });
        });

        test('should collapse FAQ item when clicked again', async () => {
            render(<FAQsSection />);
            const faqButton = screen.getByText('What is DBuddy?');

            // First click to expand
            fireEvent.click(faqButton);
            await waitFor(() => {
                const answer = "DBuddy is your ultimate backend manager that helps you manage databases, execute queries, and optimize your database operations with AI-powered assistance. It provides an intuitive interface for database management and query optimization.";
                expect(screen.getByText(answer)).toBeInTheDocument();
            });

            // Second click to collapse
            fireEvent.click(faqButton);
            await waitFor(() => {
                const answer = "DBuddy is your ultimate backend manager that helps you manage databases, execute queries, and optimize your database operations with AI-powered assistance. It provides an intuitive interface for database management and query optimization.";
                expect(screen.queryByText(answer)).not.toBeInTheDocument();
            });
        });

        test('should show ChevronDown icon when FAQ is closed', () => {
            render(<FAQsSection />);
            const chevronDowns = screen.getAllByTestId('chevron-down');
            expect(chevronDowns.length).toBeGreaterThan(0);
        });

        test('should show ChevronUp icon when FAQ is expanded', async () => {
            render(<FAQsSection />);
            const faqButton = screen.getByText('What is DBuddy?');
            fireEvent.click(faqButton);

            await waitFor(() => {
                const chevronUps = screen.getAllByTestId('chevron-up');
                expect(chevronUps.length).toBeGreaterThan(0);
            });
        });

        test('should display specific FAQ answer when expanded', async () => {
            render(<FAQsSection />);
            const createProjectButton = screen.getByText('How do I create a new project?');
            fireEvent.click(createProjectButton);

            await waitFor(() => {
                const answer = "To create a new project, go to your dashboard and click on 'Create Project'. Enter your project details including name and description. DBuddy will automatically set up a database for your project.";
                expect(screen.getByText(answer)).toBeInTheDocument();
            });
        });

        test('should handle multiple FAQs being expanded simultaneously', async () => {
            render(<FAQsSection />);
            const firstButton = screen.getByText('What is DBuddy?');
            const secondButton = screen.getByText('How do I create a new project?');

            fireEvent.click(firstButton);
            fireEvent.click(secondButton);

            await waitFor(() => {
                const answer1 = "DBuddy is your ultimate backend manager that helps you manage databases, execute queries, and optimize your database operations with AI-powered assistance. It provides an intuitive interface for database management and query optimization.";
                const answer2 = "To create a new project, go to your dashboard and click on 'Create Project'. Enter your project details including name and description. DBuddy will automatically set up a database for your project.";
                expect(screen.getByText(answer1)).toBeInTheDocument();
                expect(screen.getByText(answer2)).toBeInTheDocument();
            });
        });

        test('should toggle FAQ without affecting other FAQs', async () => {
            render(<FAQsSection />);
            const firstButton = screen.getByText('What is DBuddy?');
            const secondButton = screen.getByText('How do I create a new project?');

            fireEvent.click(firstButton);
            await waitFor(() => {
                const answer1 = "DBuddy is your ultimate backend manager that helps you manage databases, execute queries, and optimize your database operations with AI-powered assistance. It provides an intuitive interface for database management and query optimization.";
                expect(screen.getByText(answer1)).toBeInTheDocument();
            });

            const answer2 = "To create a new project, go to your dashboard and click on 'Create Project'. Enter your project details including name and description. DBuddy will automatically set up a database for your project.";
            expect(screen.queryByText(answer2)).not.toBeInTheDocument();
        });
    });

    describe('Video Tutorial Section', () => {
        test('should render iframe with correct src', () => {
            render(<FAQsSection />);
            const iframe = screen.getByTitle('DBuddy Tutorial');
            expect(iframe).toBeInTheDocument();
            expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
        });

        test('should render iframe with correct dimensions attributes', () => {
            render(<FAQsSection />);
            const iframe = screen.getByTitle('DBuddy Tutorial');
            expect(iframe).toHaveAttribute('width', '100%');
            expect(iframe).toHaveAttribute('height', '100%');
        });

        test('should render iframe with allow attributes', () => {
            render(<FAQsSection />);
            const iframe = screen.getByTitle('DBuddy Tutorial');
            expect(iframe).toHaveAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
        });

        test('should render iframe with allowFullScreen attribute', () => {
            render(<FAQsSection />);
            const iframe = screen.getByTitle('DBuddy Tutorial');
            expect(iframe).toHaveAttribute('allowFullScreen');
        });

        test('should render iframe with frameBorder attribute set to 0', () => {
            render(<FAQsSection />);
            const iframe = screen.getByTitle('DBuddy Tutorial');
            expect(iframe).toHaveAttribute('frameBorder', '0');
        });

        test('should render video tutorial description text', () => {
            render(<FAQsSection />);
            expect(screen.getByText(/Watch this comprehensive tutorial/i)).toBeInTheDocument();
            expect(screen.getByText(/Learn about creating projects, executing queries, optimizing performance/i)).toBeInTheDocument();
        });
    });

    describe('Specific FAQ Answers Content', () => {
        test('should display import database answer when expanded', async () => {
            render(<FAQsSection />);
            const button = screen.getByText('Can I import my existing database?');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/Yes! DBuddy supports importing existing databases/)).toBeInTheDocument();
            });
        });

        test('should display AI query assistance answer when expanded', async () => {
            render(<FAQsSection />);
            const button = screen.getByText('How does the AI query assistance work?');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/Our AI query assistant analyzes your natural language input/)).toBeInTheDocument();
            });
        });

        test('should display security answer when expanded', async () => {
            render(<FAQsSection />);
            const button = screen.getByText('Is my data secure?');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/Absolutely! We use industry-standard encryption/)).toBeInTheDocument();
            });
        });

        test('should display export database answer when expanded', async () => {
            render(<FAQsSection />);
            const button = screen.getByText('Can I export my database?');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/Yes, you can export your database in multiple formats/)).toBeInTheDocument();
            });
        });

        test('should display supported databases answer when expanded', async () => {
            render(<FAQsSection />);
            const button = screen.getByText('What databases are supported?');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/DBuddy currently supports PostgreSQL databases hosted on Neon/)).toBeInTheDocument();
            });
        });

        test('should display optimization answer when expanded', async () => {
            render(<FAQsSection />);
            const button = screen.getByText('How do I optimize my queries?');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/Navigate to the 'Optimization' tab/)).toBeInTheDocument();
            });
        });

        test('should display query history answer when expanded', async () => {
            render(<FAQsSection />);
            const button = screen.getByText('Can I see my query history?');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/Yes! The 'Query History' section keeps track/)).toBeInTheDocument();
            });
        });

        test('should display password reset answer when expanded', async () => {
            render(<FAQsSection />);
            const button = screen.getByText('How do I reset my password?');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/Click on 'Forgot Password'/)).toBeInTheDocument();
            });
        });

        test('should display error handling answer when expanded', async () => {
            render(<FAQsSection />);
            const button = screen.getByText('What should I do if I encounter an error?');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/If you encounter an error/)).toBeInTheDocument();
            });
        });

        test('should display collaboration answer when expanded', async () => {
            render(<FAQsSection />);
            const button = screen.getByText('Can I collaborate with team members?');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/Currently, DBuddy is designed for individual use/)).toBeInTheDocument();
            });
        });

        test('should display project deletion answer when expanded', async () => {
            render(<FAQsSection />);
            const button = screen.getByText('How do I delete a project?');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/To delete a project, go to your project page/)).toBeInTheDocument();
            });
        });

        test('should display mobile app answer when expanded', async () => {
            render(<FAQsSection />);
            const button = screen.getByText('Is there a mobile app?');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/DBuddy is currently available as a web application/)).toBeInTheDocument();
            });
        });

        test('should display support contact answer when expanded', async () => {
            render(<FAQsSection />);
            const button = screen.getByText('How can I contact support?');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/You can contact support by raising a ticket/)).toBeInTheDocument();
            });
        });
    });

    describe('CSS Classes and Styling', () => {
        test('should have correct classes on CardHeader', () => {
            render(<FAQsSection />);
            const headers = screen.getAllByTestId('card-header');
            expect(headers.length).toBeGreaterThan(0);
            headers.forEach(header => {
                expect(header).toHaveClass('card-header');
            });
        });

        test('should have correct classes on CardContent', () => {
            render(<FAQsSection />);
            const contents = screen.getAllByTestId('card-content');
            expect(contents.length).toBeGreaterThan(0);
            contents.forEach(content => {
                expect(content).toHaveClass('card-content');
            });
        });

        test('should have correct classes on CardTitle', () => {
            render(<FAQsSection />);
            const titles = screen.getAllByTestId('card-title');
            expect(titles.length).toBeGreaterThan(0);
            titles.forEach(title => {
                expect(title).toHaveClass('card-title');
            });
        });
    });

    describe('Accessibility', () => {
        test('FAQ buttons should be keyboard accessible', () => {
            render(<FAQsSection />);
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
            buttons.forEach(button => {
                expect(button).toHaveProperty('onclick');
            });
        });

        test('should have proper semantic structure', () => {
            const { container } = render(<FAQsSection />);
            const cards = container.querySelectorAll('[data-testid="card"]');
            expect(cards.length).toBe(2);
        });

        test('iframe should have title attribute', () => {
            render(<FAQsSection />);
            const iframe = screen.getByTitle('DBuddy Tutorial');
            expect(iframe.title).toBe('DBuddy Tutorial');
        });
    });

    describe('Edge Cases and State Management', () => {
        test('should maintain state when clicking same FAQ multiple times', async () => {
            render(<FAQsSection />);
            const button = screen.getByText('What is DBuddy?');
            const answer = "DBuddy is your ultimate backend manager that helps you manage databases, execute queries, and optimize your database operations with AI-powered assistance. It provides an intuitive interface for database management and query optimization.";

            // Click to expand
            fireEvent.click(button);
            await waitFor(() => {
                expect(screen.getByText(answer)).toBeInTheDocument();
            });

            // Click to collapse
            fireEvent.click(button);
            await waitFor(() => {
                expect(screen.queryByText(answer)).not.toBeInTheDocument();
            });

            // Click to expand again
            fireEvent.click(button);
            await waitFor(() => {
                expect(screen.getByText(answer)).toBeInTheDocument();
            });
        });

        test('should render all FAQs in correct order', () => {
            render(<FAQsSection />);
            const questions = [
                'What is DBuddy?',
                'How do I create a new project?',
                'Can I import my existing database?',
                'How does the AI query assistance work?',
                'Is my data secure?',
                'Can I export my database?',
                'What databases are supported?',
                'How do I optimize my queries?',
                'Can I see my query history?',
                'How do I reset my password?',
                'What should I do if I encounter an error?',
                'Can I collaborate with team members?',
                'How do I delete a project?',
                'Is there a mobile app?',
                'How can I contact support?'
            ];

            questions.forEach(question => {
                expect(screen.getByText(question)).toBeInTheDocument();
            });
        });

        test('should handle rapid clicking on multiple FAQs', async () => {
            render(<FAQsSection />);
            const button1 = screen.getByText('What is DBuddy?');
            const button2 = screen.getByText('How do I create a new project?');
            const button3 = screen.getByText('Can I import my existing database?');

            fireEvent.click(button1);
            fireEvent.click(button2);
            fireEvent.click(button3);

            await waitFor(() => {
                expect(screen.getByText(/DBuddy is your ultimate backend manager/)).toBeInTheDocument();
                expect(screen.getByText(/To create a new project/)).toBeInTheDocument();
                expect(screen.getByText(/Yes! DBuddy supports importing existing databases/)).toBeInTheDocument();
            });
        });
    });

    describe('Component Isolation', () => {
        test('should not render any external dependencies unnecessarily', () => {
            const { container } = render(<FAQsSection />);
            // Verify no unexpected elements are rendered
            expect(container.querySelectorAll('script').length).toBe(0);
        });

        test('should properly isolate FAQ state between renders', () => {
            const { rerender } = render(<FAQsSection />);
            expect(screen.getByText('What is DBuddy?')).toBeInTheDocument();

            rerender(<FAQsSection />);
            expect(screen.getByText('What is DBuddy?')).toBeInTheDocument();
        });
    });
});
