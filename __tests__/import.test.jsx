import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ImportDatabase } from "@/components/(dashboard)/ImportDatabase";

// Mock the Dialog components from Radix UI
jest.mock("@/components/ui/dialog", () => ({
    Dialog: ({ children, open, onOpenChange }) => (
        <div data-testid="dialog" data-open={open}>
            {children}
        </div>
    ),
    DialogTrigger: ({ children, asChild }) => <div>{children}</div>,
    DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
    DialogHeader: ({ children }) => <div>{children}</div>,
    DialogTitle: ({ children }) => <h2>{children}</h2>,
    DialogDescription: ({ children }) => <p>{children}</p>,
    DialogFooter: ({ children }) => <div data-testid="dialog-footer">{children}</div>,
    DialogClose: ({ children, asChild }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/input", () => ({
    Input: React.forwardRef(({ name, value, onChange, type = "text", ...props }, ref) => (
        <input
            ref={ref}
            name={name}
            id={name}
            value={value}
            onChange={onChange}
            type={type}
            {...props}
        />
    )),
}));

describe("ImportDatabase Component", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("Rendering", () => {
        it("should render the import button", () => {
            render(<ImportDatabase onImported={jest.fn()} />);
            expect(
                screen.getByRole("button", { name: "Import Database" })
            ).toBeInTheDocument();
        });

        it("should render dialog title", () => {
            render(<ImportDatabase onImported={jest.fn()} />);
            expect(
                screen.getByText("Import Existing Database")
            ).toBeInTheDocument();
        });

        it("should render dialog description", () => {
            render(<ImportDatabase onImported={jest.fn()} />);
            expect(
                screen.getByText(
                    /Connect an existing PostgreSQL\/Neon database to DBuddy/
                )
            ).toBeInTheDocument();
        });

        it("should render all form fields", () => {
            render(<ImportDatabase onImported={jest.fn()} />);

            // Verify inputs exist with name attributes
            expect(document.querySelector('input[name="host"]')).toBeInTheDocument();
            expect(document.querySelector('input[name="port"]')).toBeInTheDocument();
            expect(document.querySelector('input[name="username"]')).toBeInTheDocument();
            expect(document.querySelector('input[name="password"]')).toBeInTheDocument();
            expect(document.querySelector('input[name="database"]')).toBeInTheDocument();
            expect(document.querySelector('input[name="projectName"]')).toBeInTheDocument();
        });

        it("should have password input type for password field", () => {
            render(<ImportDatabase onImported={jest.fn()} />);
            const passwordField = document.querySelector('input[name="password"]');
            expect(passwordField).toHaveAttribute("type", "password");
        });

        it("should render submit and cancel buttons", () => {
            render(<ImportDatabase onImported={jest.fn()} />);
            expect(screen.getByRole("button", { name: "Import" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
        });

        it("should have default port value of 5432", () => {
            render(<ImportDatabase onImported={jest.fn()} />);
            const portInput = document.querySelector('input[name="port"]');
            // Port value is a string in the DOM input
            expect(portInput.value).toBe("5432");
        });
    });

    describe("Form Input Handling", () => {
        it("should update form state when user enters host", async () => {
            const user = userEvent.setup();
            render(<ImportDatabase onImported={jest.fn()} />);

            const hostInput = document.querySelector('input[name="host"]');
            await user.type(hostInput, "localhost");

            expect(hostInput).toHaveValue("localhost");
        });

        it("should update form state for all fields", async () => {
            const user = userEvent.setup();
            render(<ImportDatabase onImported={jest.fn()} />);

            const hostInput = document.querySelector('input[name="host"]');
            const portInput = document.querySelector('input[name="port"]');
            const usernameInput = document.querySelector('input[name="username"]');
            const passwordInput = document.querySelector('input[name="password"]');
            const databaseInput = document.querySelector('input[name="database"]');
            const projectNameInput = document.querySelector('input[name="projectName"]');

            await user.clear(portInput);
            await user.type(hostInput, "db.example.com");
            await user.type(portInput, "5433");
            await user.type(usernameInput, "admin");
            await user.type(passwordInput, "secure_password");
            await user.type(databaseInput, "production");
            await user.type(projectNameInput, "My Project");

            expect(hostInput).toHaveValue("db.example.com");
            expect(portInput.value).toBe("5433");
            expect(usernameInput).toHaveValue("admin");
            expect(passwordInput).toHaveValue("secure_password");
            expect(databaseInput).toHaveValue("production");
            expect(projectNameInput).toHaveValue("My Project");
        });

        it("should allow clearing form fields", async () => {
            const user = userEvent.setup();
            render(<ImportDatabase onImported={jest.fn()} />);

            const hostInput = document.querySelector('input[name="host"]');
            await user.type(hostInput, "localhost");
            expect(hostInput).toHaveValue("localhost");

            await user.clear(hostInput);
            expect(hostInput).toHaveValue("");
        });
    });

    describe("Form Submission - Success", () => {
        it("should submit form with correct data", async () => {
            const user = userEvent.setup();
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ project: { id: 1, project_name: "Test" } }),
            });

            render(<ImportDatabase onImported={jest.fn()} />);

            const hostInput = document.querySelector('input[name="host"]');
            const portInput = document.querySelector('input[name="port"]');
            const usernameInput = document.querySelector('input[name="username"]');
            const passwordInput = document.querySelector('input[name="password"]');
            const databaseInput = document.querySelector('input[name="database"]');
            const projectNameInput = document.querySelector('input[name="projectName"]');

            await user.clear(portInput);
            await user.type(hostInput, "localhost");
            await user.type(portInput, "5432");
            await user.type(usernameInput, "admin");
            await user.type(passwordInput, "password123");
            await user.type(databaseInput, "mydb");
            await user.type(projectNameInput, "My DB");

            const submitButton = screen.getByRole("button", { name: "Import" });
            await user.click(submitButton);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    "/api/projects/import",
                    expect.objectContaining({
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                    })
                );
            });

            const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
            expect(callBody.host).toBe("localhost");
            expect(callBody.username).toBe("admin");
            expect(callBody.password).toBe("password123");
            expect(callBody.database).toBe("mydb");
            expect(callBody.projectName).toBe("My DB");
            // Port might be string or number depending on the component
            expect(String(callBody.port)).toBe("5432");
        });

        it("should call onImported callback on successful import", async () => {
            const user = userEvent.setup();
            const onImportedMock = jest.fn();

            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    project: { id: 1, project_name: "Test", database_name: "testdb" },
                }),
            });

            render(<ImportDatabase onImported={onImportedMock} />);

            const hostInput = document.querySelector('input[name="host"]');
            const usernameInput = document.querySelector('input[name="username"]');
            const databaseInput = document.querySelector('input[name="database"]');

            await user.type(hostInput, "localhost");
            await user.type(usernameInput, "admin");
            await user.type(databaseInput, "testdb");

            const submitButton = screen.getByRole("button", { name: "Import" });
            await user.click(submitButton);

            await waitFor(() => {
                expect(onImportedMock).toHaveBeenCalledWith({
                    id: 1,
                    project_name: "Test",
                    database_name: "testdb",
                });
            });
        });

        it("should close dialog on successful import", async () => {
            const user = userEvent.setup();
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ project: { id: 1 } }),
            });

            const { container } = render(<ImportDatabase onImported={jest.fn()} />);

            const hostInput = document.querySelector('input[name="host"]');
            const usernameInput = document.querySelector('input[name="username"]');
            const databaseInput = document.querySelector('input[name="database"]');

            await user.type(hostInput, "localhost");
            await user.type(usernameInput, "admin");
            await user.type(databaseInput, "testdb");

            const submitButton = screen.getByRole("button", { name: "Import" });
            await user.click(submitButton);

            await waitFor(() => {
                const dialog = container.querySelector('[data-testid="dialog"]');
                expect(dialog).toHaveAttribute("data-open", "false");
            });
        });

        it("should clear form after successful import", async () => {
            const user = userEvent.setup();
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ project: { id: 1 } }),
            });

            render(<ImportDatabase onImported={jest.fn()} />);

            const hostInput = document.querySelector('input[name="host"]');
            const usernameInput = document.querySelector('input[name="username"]');
            const databaseInput = document.querySelector('input[name="database"]');
            const portInput = document.querySelector('input[name="port"]');

            await user.type(hostInput, "localhost");
            await user.type(usernameInput, "admin");
            await user.type(databaseInput, "testdb");

            const submitButton = screen.getByRole("button", { name: "Import" });
            await user.click(submitButton);

            await waitFor(() => {
                expect(hostInput).toHaveValue("");
                expect(usernameInput).toHaveValue("");
                expect(databaseInput).toHaveValue("");
                expect(portInput.value).toBe("5432");
            });
        });
    });

    describe("Form Submission - Errors", () => {
        it("should display error message when import fails", async () => {
            const user = userEvent.setup();
            global.fetch = jest.fn().mockResolvedValue({
                ok: false,
                json: async () => ({ error: "Unable to connect with provided credentials" }),
            });

            render(<ImportDatabase onImported={jest.fn()} />);

            const hostInput = document.querySelector('input[name="host"]');
            const usernameInput = document.querySelector('input[name="username"]');
            const databaseInput = document.querySelector('input[name="database"]');

            await user.type(hostInput, "invalid-host");
            await user.type(usernameInput, "admin");
            await user.type(databaseInput, "testdb");

            const submitButton = screen.getByRole("button", { name: "Import" });
            await user.click(submitButton);

            await waitFor(() => {
                expect(
                    screen.getByText("Unable to connect with provided credentials")
                ).toBeInTheDocument();
            });
        });

        it("should display network error message on fetch failure", async () => {
            const user = userEvent.setup();
            global.fetch = jest.fn().mockRejectedValue(
                new Error("Network request failed")
            );

            render(<ImportDatabase onImported={jest.fn()} />);

            const hostInput = document.querySelector('input[name="host"]');
            const usernameInput = document.querySelector('input[name="username"]');
            const databaseInput = document.querySelector('input[name="database"]');

            await user.type(hostInput, "localhost");
            await user.type(usernameInput, "admin");
            await user.type(databaseInput, "testdb");

            const submitButton = screen.getByRole("button", { name: "Import" });
            await user.click(submitButton);

            await waitFor(() => {
                expect(
                    screen.getByText("Network request failed")
                ).toBeInTheDocument();
            });
        });

        it("should clear error message on new submission", async () => {
            const user = userEvent.setup();
            global.fetch = jest
                .fn()
                .mockRejectedValueOnce(new Error("First error"))
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ project: { id: 1 } }),
                });

            render(<ImportDatabase onImported={jest.fn()} />);

            const hostInput = document.querySelector('input[name="host"]');
            const usernameInput = document.querySelector('input[name="username"]');
            const databaseInput = document.querySelector('input[name="database"]');
            const submitButton = screen.getByRole("button", { name: "Import" });

            // First submission fails
            await user.type(hostInput, "localhost");
            await user.type(usernameInput, "admin");
            await user.type(databaseInput, "testdb");
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText("First error")).toBeInTheDocument();
            });

            // Clear form and submit again
            await user.clear(hostInput);
            await user.clear(usernameInput);
            await user.clear(databaseInput);

            await user.type(hostInput, "localhost");
            await user.type(usernameInput, "admin");
            await user.type(databaseInput, "testdb");
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.queryByText("First error")).not.toBeInTheDocument();
            });
        });

        it("should display default error message when error.error is undefined", async () => {
            const user = userEvent.setup();
            global.fetch = jest.fn().mockResolvedValue({
                ok: false,
                json: async () => ({}), // No error message
            });

            render(<ImportDatabase onImported={jest.fn()} />);

            const hostInput = document.querySelector('input[name="host"]');
            const usernameInput = document.querySelector('input[name="username"]');
            const databaseInput = document.querySelector('input[name="database"]');

            await user.type(hostInput, "localhost");
            await user.type(usernameInput, "admin");
            await user.type(databaseInput, "testdb");

            const submitButton = screen.getByRole("button", { name: "Import" });
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText("Import failed")).toBeInTheDocument();
            });
        });
    });

    describe("Loading State", () => {
        it("should show loading state while submitting", async () => {
            const user = userEvent.setup();
            let resolveRequest;
            const requestPromise = new Promise((resolve) => {
                resolveRequest = resolve;
            });

            global.fetch = jest.fn(() => requestPromise);

            render(<ImportDatabase onImported={jest.fn()} />);

            const hostInput = document.querySelector('input[name="host"]');
            const usernameInput = document.querySelector('input[name="username"]');
            const databaseInput = document.querySelector('input[name="database"]');

            await user.type(hostInput, "localhost");
            await user.type(usernameInput, "admin");
            await user.type(databaseInput, "testdb");

            const submitButton = screen.getByRole("button", { name: "Import" });
            await user.click(submitButton);

            // Button should show loading text
            await waitFor(() => {
                expect(
                    screen.getByRole("button", { name: "Importing..." })
                ).toBeInTheDocument();
            });

            // Resolve request
            resolveRequest({
                ok: true,
                json: async () => ({ project: { id: 1 } }),
            });

            // Button should return to normal text
            await waitFor(() => {
                expect(
                    screen.getByRole("button", { name: "Import" })
                ).toBeInTheDocument();
            });
        });

        it("should disable submit button while loading", async () => {
            const user = userEvent.setup();
            let resolveRequest;
            const requestPromise = new Promise((resolve) => {
                resolveRequest = resolve;
            });

            global.fetch = jest.fn(() => requestPromise);

            render(<ImportDatabase onImported={jest.fn()} />);

            const hostInput = document.querySelector('input[name="host"]');
            const usernameInput = document.querySelector('input[name="username"]');
            const databaseInput = document.querySelector('input[name="database"]');

            await user.type(hostInput, "localhost");
            await user.type(usernameInput, "admin");
            await user.type(databaseInput, "testdb");

            const submitButton = screen.getByRole("button", { name: "Import" });
            await user.click(submitButton);

            // Button should be disabled
            await waitFor(() => {
                expect(
                    screen.getByRole("button", { name: "Importing..." })
                ).toBeDisabled();
            });

            // Resolve request
            resolveRequest({
                ok: true,
                json: async () => ({ project: { id: 1 } }),
            });

            // Button should be enabled again
            await waitFor(() => {
                expect(
                    screen.getByRole("button", { name: "Import" })
                ).not.toBeDisabled();
            });
        });
    });

    describe("Form Validation", () => {
        it("should have required attribute on required fields", () => {
            render(<ImportDatabase onImported={jest.fn()} />);

            expect(document.querySelector('input[name="host"]')).toHaveAttribute("required");
            expect(document.querySelector('input[name="port"]')).toHaveAttribute("required");
            expect(document.querySelector('input[name="username"]')).toHaveAttribute("required");
            expect(document.querySelector('input[name="database"]')).toHaveAttribute("required");
        });

        it("should not require password field", () => {
            render(<ImportDatabase onImported={jest.fn()} />);

            expect(document.querySelector('input[name="password"]')).not.toHaveAttribute("required");
        });

        it("should not require project name field", () => {
            render(<ImportDatabase onImported={jest.fn()} />);

            expect(document.querySelector('input[name="projectName"]')).not.toHaveAttribute("required");
        });
    });

    describe("Cancel Functionality", () => {
        it("should close dialog when cancel button clicked", async () => {
            const user = userEvent.setup();
            const { container } = render(<ImportDatabase onImported={jest.fn()} />);

            const cancelButton = screen.getByRole("button", { name: "Cancel" });
            await user.click(cancelButton);

            const dialog = container.querySelector('[data-testid="dialog"]');
            expect(dialog).toHaveAttribute("data-open", "false");
        });

        it("should not call onImported when canceled", async () => {
            const user = userEvent.setup();
            const onImportedMock = jest.fn();

            render(<ImportDatabase onImported={onImportedMock} />);

            const hostInput = document.querySelector('input[name="host"]');
            await user.type(hostInput, "localhost");

            const cancelButton = screen.getByRole("button", { name: "Cancel" });
            await user.click(cancelButton);

            expect(onImportedMock).not.toHaveBeenCalled();
        });
    });

    describe("Optional Callback", () => {
        it("should handle undefined onImported callback", async () => {
            const user = userEvent.setup();
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ project: { id: 1 } }),
            });

            // Should not throw error when onImported is not provided
            render(<ImportDatabase />);

            const hostInput = document.querySelector('input[name="host"]');
            const usernameInput = document.querySelector('input[name="username"]');
            const databaseInput = document.querySelector('input[name="database"]');

            await user.type(hostInput, "localhost");
            await user.type(usernameInput, "admin");
            await user.type(databaseInput, "testdb");

            const submitButton = screen.getByRole("button", { name: "Import" });
            await user.click(submitButton);

            await waitFor(() => {
                // Should not throw error
                expect(screen.getByRole("button", { name: "Import" })).toBeInTheDocument();
            });
        });
    });

    describe("Port Field Edge Cases", () => {
        it("should accept custom port numbers", async () => {
            const user = userEvent.setup();
            render(<ImportDatabase onImported={jest.fn()} />);

            const portInput = document.querySelector('input[name="port"]');
            await user.clear(portInput);
            await user.type(portInput, "3306");

            // Port input value is stored as string in the component
            expect(portInput.value).toBe("3306");
        });

        it("should handle port in form state", async () => {
            const user = userEvent.setup();
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ project: { id: 1 } }),
            });

            render(<ImportDatabase onImported={jest.fn()} />);

            const hostInput = document.querySelector('input[name="host"]');
            const portInput = document.querySelector('input[name="port"]');
            const usernameInput = document.querySelector('input[name="username"]');
            const databaseInput = document.querySelector('input[name="database"]');

            await user.type(hostInput, "localhost");
            await user.clear(portInput);
            await user.type(portInput, "5433");
            await user.type(usernameInput, "admin");
            await user.type(databaseInput, "testdb");

            const submitButton = screen.getByRole("button", { name: "Import" });
            await user.click(submitButton);

            await waitFor(() => {
                const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
                // Port is sent as the value from the input (string or number depending on component implementation)
                expect(callBody.port).toBeDefined();
                expect(String(callBody.port)).toBe("5433");
            });
        });
    });
});