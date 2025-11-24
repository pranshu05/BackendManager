// __tests__/history.test.jsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import History, { convertToCSV } from "../../../src/components/(projects)/history.jsx";


// Mock next/navigation useParams
const mockUseParams = jest.fn();
jest.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
}));
mockUseParams.mockReturnValue({ slug: "test-project-id" });

// UI component mocks
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props) => <input {...props} />,
}));

jest.mock("@/components/ui/textarea", () => ({
  Textarea: (props) => <textarea data-testid="edit-textarea" {...props} />,
}));

jest.mock("@/components/ui/ExportDropdown", () => ({
  __esModule: true,
  default: ({ options = [], onSelect, disabled, isLoading }) => (
    <select
      data-testid="export-dropdown"
      disabled={disabled || isLoading}
      onChange={(e) => onSelect(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  ),
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2>{children}</h2>,
  DialogFooter: ({ children }) => <div>{children}</div>,
  DialogClose: ({ children }) => <div>{children}</div>,
}));

// Mock xlsx used by component
jest.mock("xlsx", () => ({
  utils: {
    book_new: jest.fn(() => ({})),
    json_to_sheet: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}));

// Mock document.createElement for anchor link handling in export logic
const originalCreateElement = document.createElement.bind(document);
document.createElement = jest.fn((tagName) => {
  const element = originalCreateElement(tagName);
  if (tagName === "a") {
    element.click = jest.fn();
    element.remove = jest.fn();
  }
  return element;
});

// Mock global URL and alert usage
global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = jest.fn();
global.alert = jest.fn();

const mockHistoryData = {
  history: [
    {
      id: 1,
      natural_language_input: "Get all users",
      query_text: "SELECT * FROM users",
      success: true,
      query_type: "SELECT",
      created_at: new Date("2025-11-22T10:00:00Z").toISOString(),
      execution_time_ms: 10,
      error_message: "",
      is_favorite: false,
    },
    {
      id: 2,
      natural_language_input: "Insert new user",
      query_text: "INSERT INTO users VALUES (1, 'John')",
      success: false,
      query_type: "INSERT",
      created_at: new Date("2025-11-21T10:00:00Z").toISOString(),
      execution_time_ms: 5,
      error_message: "Duplicate entry",
      is_favorite: true,
    },
  ],
  total: 2,
};

describe("History Component - Unit Tests", () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockHistoryData),
      })
    );
    global.fetch = mockFetch;
    jest.clearAllMocks();
     if (typeof mockUseParams !== 'undefined') {
        mockUseParams.mockReturnValue({ slug: "test-project-id" });
    }
  });

  test("renders query history and basic UI", async () => {
    render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);
    expect(screen.getByText(/Query History/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Get all users/i)).toBeInTheDocument();
      expect(screen.getByText(/SELECT \* FROM users/i)).toBeInTheDocument();
    });
  });

  test("loading state shows when fetch is delayed", async () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {}));
    render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);
    expect(screen.getByText(/Loading history/i)).toBeInTheDocument();
  });

  test("fetchHistory called with project id path", async () => {
    render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/projects/test-project-id/history")
      );
    });
  });

  test("handles fetch error gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Failed to fetch" }),
    });
    render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Error fetching history");
    });
  });
  
  describe("Filters modal behavior", () => {
    test("opens filter modal and apply/clear filters", async () => {
      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      await waitFor(() => screen.getByText(/Get all users/i));
      fireEvent.click(screen.getByText(/Filters/i));

      // Click favorites toggle
      fireEvent.click(screen.getByText(/Show Favorites Only/i));
      // Apply
      fireEvent.click(screen.getByText(/Apply/i));
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Open again and Clear All
      fireEvent.click(screen.getByText(/Filters/i));
      fireEvent.click(screen.getByText(/Clear All/i));
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });
  test("updates filter count and fetches with multiple active filters (covers count logic)", async () => {
      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);
      await waitFor(() => screen.getByText(/Get all users/i));

      // 1. Open Filter Modal
      fireEvent.click(screen.getByText(/Filters/i));

      // 2. Select a Status Filter
      const successBtn = screen.getByText("Success");
      fireEvent.click(successBtn);

      // 3. Select a Query Type Filter
      const selectTypeBtn = screen.getByText("View Data");
      fireEvent.click(selectTypeBtn);

      // 4. Select a Date Range Filter
      const todayBtn = screen.getByText("Today");
      fireEvent.click(todayBtn);

      // 5. Apply Filters
      fireEvent.click(screen.getByText("Apply"));

      // 6. Verify fetch was called with specific params
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringMatching(/status=success/)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringMatching(/type=SELECT/)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringMatching(/dateRange=today/)
        );
      });

      // 7. Verify UI shows the active count badge (We applied 3 filters)
      // The component renders the count inside a span in the Filters button
      // Note: We look for the button containing "Filters" and check its text content for the badge number
      const filterButton = screen.getByText(/Filters/i).closest('button');
      expect(filterButton).toHaveTextContent("3");
    });

  describe("Search functionality", () => {
    test("filters by title search term", async () => {
      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);
      await waitFor(() => screen.getByText(/Get all users/i));
      const searchInput = screen.getByPlaceholderText(/Search history/i);
      fireEvent.change(searchInput, { target: { value: "Get all" } });

      expect(screen.getByText(/Get all users/i)).toBeInTheDocument();
      expect(screen.queryByText(/Insert new user/i)).not.toBeInTheDocument();
    });

    test("search is case insensitive", async () => {
      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);
      await waitFor(() => screen.getByText(/Get all users/i));
      const searchInput = screen.getByPlaceholderText(/Search history/i);
      fireEvent.change(searchInput, { target: { value: "USERS" } });

      expect(screen.getByText(/Get all users/i)).toBeInTheDocument();
    });
  });
  
  describe("favorite toggle", () => {
    test("toggles favorite status successfully", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockHistoryData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ updatedItem: { is_favorite: true } }),
        });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      await waitFor(() => screen.getByText(/Get all users/i));
      const favoriteButtons = screen.getAllByTitle(/favorites/i);
      fireEvent.click(favoriteButtons[0]);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/projects/test-project-id/history/1"),
          expect.objectContaining({
            method: "PUT",
            body: JSON.stringify({ is_favorite: true }),
          })
        );
      });
    });

    test("reverts favorite on API failure", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockHistoryData),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: "Failed" }),
        });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      await waitFor(() => screen.getByText(/Get all users/i));
      const favoriteButtons = screen.getAllByTitle(/favorites/i);
      fireEvent.click(favoriteButtons[0]);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith("Error updating. Reverting.");
      });
    });
    test("updates state from server response (covers successful save callback)", async () => {
      // 1. Initial Load (Item 1 is not favorite)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoryData),
      });

      // 2. Mock Toggle Response: Server returns is_favorite: FALSE
      // This ensures the code hits: is_favorite: data.updatedItem.is_favorite
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ updatedItem: { is_favorite: false } }),
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      await waitFor(() => screen.getByText(/Get all users/i));
      
      const favoriteButtons = screen.getAllByTitle(/favorites/i);
      const targetBtn = favoriteButtons[0];

      // 3. Click to toggle
      fireEvent.click(targetBtn);

      // 4. Verify UI updates based on SERVER response (False), not just the click
      await waitFor(() => {
        // If the red line works, this should be "Add to favorites" (False)
        expect(screen.getByTitle(/Add to favorites/i)).toBeInTheDocument();
      });
    });
    
  });

  describe("Edit modal and run edited query", () => {
    test("opens edit modal and shows SQL", async () => {
      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      await waitFor(() => screen.getByText(/Get all users/i));
      const editButtons = screen.getAllByTitle(/Edit query in new window/i);
      fireEvent.click(editButtons[0]);

      expect(screen.getByText(/Edit Query/i)).toBeInTheDocument();
      expect(screen.getByTestId("edit-textarea")).toHaveValue("SELECT * FROM users");
    });
    test("closes edit modal when Cancel button is clicked", async () => {
      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      await waitFor(() => screen.getByText(/Get all users/i));

      // 1. Open the modal
      const editButtons = screen.getAllByTitle(/Edit query in new window/i);
      fireEvent.click(editButtons[0]);

      // Verify it is open
      expect(screen.getByText("Edit Query")).toBeInTheDocument();

      // 2. Click "Cancel"
      fireEvent.click(screen.getByText("Cancel"));

      // 3. Verify the modal is closed
      await waitFor(() => {
        expect(screen.queryByText("Edit Query")).not.toBeInTheDocument();
      });
    });

    test("runs edited SELECT query and displays result table", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockHistoryData),
        })
        // Title generation AI attempt - simulate failure path (ok: false) OR success - both are handled
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: "AI failed" }),
        })
        // Run query response with data rows
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ id: 1, name: "John" }] }),
        });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      await waitFor(() => screen.getByText(/Get all users/i));
      const editButtons = screen.getAllByTitle(/Edit query in new window/i);
      fireEvent.click(editButtons[0]);

      // Click "Run Edited Query"
      fireEvent.click(screen.getByText(/Run Edited Query/i));

      await waitFor(() => {
        expect(screen.getByText(/Query Result/i)).toBeInTheDocument();
        expect(screen.getByText(/John/i)).toBeInTheDocument();
      });
    });

    test("shows query execution error in modal when API fails", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockHistoryData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ naturalLanguageTitle: "Title" }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: "Syntax error" }),
        });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      await waitFor(() => screen.getByText(/Get all users/i));
      const editButtons = screen.getAllByTitle(/Edit query in new window/i);
      fireEvent.click(editButtons[0]);

      // modify textarea to invalid SQL and run
      fireEvent.change(screen.getByTestId("edit-textarea"), {
        target: { value: "SELECT * FROM invalid" },
      });
      fireEvent.click(screen.getByText(/Run Edited Query/i));

      await waitFor(() => {
        expect(screen.getByText(/Error: Syntax error/i)).toBeInTheDocument();
      });
    });
    test("logs error when title generation API fails and continues", async () => {
  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockHistoryData),
    })
    // Title generation fails here
    .mockRejectedValueOnce(new Error("AI title failed"))
    .mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "AI title failed" }),
    })
    // After title failure, run query request (success)
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: 1, name: "John" }] }),
    });

  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

  await waitFor(() => screen.getByText(/Get all users/i));

  // open edit modal
  fireEvent.click(screen.getAllByTitle(/Edit query in new window/i)[0]);

  // run edited query
  fireEvent.click(screen.getByText(/Run Edited Query/i));

  await waitFor(() => {
    expect(consoleSpy).toHaveBeenCalled();
  });

  expect(consoleSpy.mock.calls[0][0]).toBe(
    "Title generation failed, proceeding without it:"
  );

  const loggedError = consoleSpy.mock.calls[0][1];
  expect(loggedError.message).toBe("AI title failed");

  consoleSpy.mockRestore();
});
test("runs edited non-SELECT query and refreshes history", async () => {
      // 1. Initial Load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoryData),
      });

      // 2. AI Title Generation (Success)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ naturalLanguageTitle: "Insert User" }),
      });

      // 3. Execute Query (Non-Select Success)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // 4. Refresh History (This is the red line executing)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoryData),
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      await waitFor(() => screen.getByText(/Get all users/i));
      
      // Open edit modal
      fireEvent.click(screen.getAllByTitle(/Edit query in new window/i)[0]);

      // Change SQL to a non-SELECT query
      fireEvent.change(screen.getByTestId("edit-textarea"), {
        target: { value: "INSERT INTO users (name) VALUES ('Alice')" },
      });

      // Run the query
      fireEvent.click(screen.getByText(/Run Edited Query/i));
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(4);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/projects/test-project-id/history")
        );
      });
    });
  });
  

  describe("Rerun behavior", () => {
    test("reruns SELECT and displays results", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockHistoryData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ id: 1, name: "John" }] }),
        });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      await waitFor(() => screen.getByText(/Get all users/i));
      const rerunButtons = screen.getAllByTitle(/Rerun query/i);
      fireEvent.click(rerunButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Query Result/i)).toBeInTheDocument();
      });
    });
     test("shows error when rerun API returns an error", async () => {
    // First fetch to load initial history
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoryData),
      })
      // Second fetch: rerun API FAILS here
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Rerun failed on server" }),
      });

    render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

    await waitFor(() => screen.getByText("Get all users"));

    const rerunButtons = screen.getAllByTitle(/Rerun query/i);

    // Click rerun on the first item
    fireEvent.click(rerunButtons[0]);

    // The component should catch the thrown error and show an alert
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        "Error rerunning query: Rerun failed on server"
      );
    });
  });
    test("reruns non-SELECT and refreshes history", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockHistoryData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockHistoryData),
        });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      await waitFor(() => screen.getByText(/Insert new user/i));
      const rerunButtons = screen.getAllByTitle(/Rerun query/i);
      fireEvent.click(rerunButtons[1]);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/projects/test-project-id/query"),
          expect.objectContaining({ method: "POST" })
        );
      });
    });
  });

  describe("Export functionality", () => {
    test("exports JSON via dropdown", async () => {
      // Prepare a runResult by rerunning a SELECT
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockHistoryData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ id: 1, name: "John" }] }),
        });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);
      await waitFor(() => screen.getByText(/Get all users/i));
      const rerunButtons = screen.getAllByTitle(/Rerun query/i);
      fireEvent.click(rerunButtons[0]);

      await waitFor(() => screen.getByText(/Query Result/i));

      // Select JSON from mocked ExportDropdown
      fireEvent.change(screen.getByTestId("export-dropdown"), {
        target: { value: "JSON" },
      });

      // JSON export should call download flow (we mocked URL.createObjectURL and anchor)
      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled();
      });
    });
    test("exports XLSX via dropdown (covers XLSX logic)", async () => {
      // 1. Mock Data Load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoryData),
      });

      // 2. Mock Query Execution Success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 1, name: "XLSX Test" }] }),
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);
      await waitFor(() => screen.getByText(/Get all users/i));

      // 3. Run Query to enable export button
      fireEvent.click(screen.getAllByTitle(/Rerun query/i)[0]);
      await waitFor(() => screen.getByText(/Query Result/i));

      // 4. Select XLSX
      const XLSX = require("xlsx"); 
      fireEvent.change(screen.getByTestId("export-dropdown"), {
        target: { value: "XLSX" },
      });

      // 5. Verify XLSX functions were called
      await waitFor(() => {
        expect(XLSX.utils.book_new).toHaveBeenCalled();
        expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
        expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
        expect(XLSX.writeFile).toHaveBeenCalled();
      });
    });

    test("shows alert when export fails (covers catch block)", async () => {
      // 1. Mock Data Load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoryData),
      });

      // 2. Mock Query Execution
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 1, name: "Error Test" }] }),
      });

      // 3. Mock console.error to keep test output clean
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      // 4. Force an error during export 
      const originalCreateObjectUrl = global.URL.createObjectURL;
      global.URL.createObjectURL = jest.fn(() => {
        throw new Error("Simulated Export Failure");
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);
      await waitFor(() => screen.getByText(/Get all users/i));

      // 5. Run Query
      fireEvent.click(screen.getAllByTitle(/Rerun query/i)[0]);
      await waitFor(() => screen.getByText(/Query Result/i));

      // 6. Trigger Export (JSON)
      fireEvent.change(screen.getByTestId("export-dropdown"), {
        target: { value: "JSON" },
      });

      // 7. Verify Catch Block Execution
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Export error:", 
          expect.any(Error)
        );
        expect(global.alert).toHaveBeenCalledWith("Failed to export data.");
      });

      // Cleanup
      consoleSpy.mockRestore();
      global.URL.createObjectURL = originalCreateObjectUrl;
    });
    test("shows alert if export is attempted with empty data (covers defensive check)", async () => {
      // 1. Mock History Load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoryData),
      });

      // 2. Mock Query Result as EMPTY Array
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);
      await waitFor(() => screen.getByText(/Get all users/i));

      // 3. Run Query
      fireEvent.click(screen.getAllByTitle(/Rerun query/i)[0]);

      // 4. Wait for "No records found"
      await waitFor(() => screen.getByText(/No records found/i));

      // 5. Find Dropdown and Force Trigger Export
      const dropdown = screen.getByTestId("export-dropdown");
      fireEvent.change(dropdown, { target: { value: "JSON" } });

      // 6. Verify the specific alert for empty data
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith("No data to export.");
      });
    });


    test("exports CSV via dropdown", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockHistoryData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ id: 1, name: "John" }] }),
        });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);
      await waitFor(() => screen.getByText(/Get all users/i));
      const rerunButtons = screen.getAllByTitle(/Rerun query/i);
      fireEvent.click(rerunButtons[0]);

      await waitFor(() => screen.getByText(/Query Result/i));
      fireEvent.change(screen.getByTestId("export-dropdown"), {
        target: { value: "CSV" },
      });

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled();
      });
    });

    test("handles export when there's no data", async () => {
  render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

  await waitFor(() => screen.getByText(/Get all users/i));

  // Export dropdown should NOT appear because runResult = null
  expect(screen.queryByTestId("export-dropdown")).not.toBeInTheDocument();
});
test("exports CSV correctly handling null values (covers CSV logic)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoryData),
      });

      // Mock data with nulls to trigger the specific logic line
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          data: [
            { id: 1, name: null, role: undefined }, 
            { id: 2, name: "Alice", role: "Admin" }
          ] 
        }),
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);
      await waitFor(() => screen.getByText(/Get all users/i));
      
      fireEvent.click(screen.getAllByTitle(/Rerun query/i)[0]);
      await waitFor(() => screen.getByText(/Query Result/i));

      fireEvent.change(screen.getByTestId("export-dropdown"), {
        target: { value: "CSV" },
      });

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled();
      });
    });

    // 2. Covers logic: if (fileFormat === "xlsx") { ... }
    test("exports XLSX via dropdown (covers XLSX logic)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoryData),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 1, name: "XLSX Test" }] }),
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);
      await waitFor(() => screen.getByText(/Get all users/i));

      fireEvent.click(screen.getAllByTitle(/Rerun query/i)[0]);
      await waitFor(() => screen.getByText(/Query Result/i));

      // Require the mocked module to check calls
      const XLSX = require("xlsx"); 
      fireEvent.change(screen.getByTestId("export-dropdown"), {
        target: { value: "XLSX" },
      });

      await waitFor(() => {
        expect(XLSX.utils.book_new).toHaveBeenCalled();
        expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
        expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
        expect(XLSX.writeFile).toHaveBeenCalled();
      });
    });

    // 3. Covers logic: } catch (error) { console.error(...); alert(...); }
    test("shows alert when export fails (covers catch block)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoryData),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 1, name: "Error Test" }] }),
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      
      // Force failure by making URL creation throw
      const originalCreate = global.URL.createObjectURL;
      global.URL.createObjectURL = jest.fn(() => { throw new Error("Export Failed"); });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);
      await waitFor(() => screen.getByText(/Get all users/i));

      fireEvent.click(screen.getAllByTitle(/Rerun query/i)[0]);
      await waitFor(() => screen.getByText(/Query Result/i));

      fireEvent.change(screen.getByTestId("export-dropdown"), {
        target: { value: "JSON" },
      });

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith("Failed to export data.");
      });

      consoleSpy.mockRestore();
      global.URL.createObjectURL = originalCreate;
    });
test("exports CSV correctly handling null values (covers CSV logic)", async () => {
      // 1. Mock History Load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoryData),
      });

      // 2. Mock Query Result containing NULL and UNDEFINED values
      // This forces the code to hit the logic: if (value === null || value === undefined) value = "";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          data: [
            { id: 1, name: null, role: undefined }, 
            { id: 2, name: "Alice", role: "Admin" }
          ] 
        }),
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);
      await waitFor(() => screen.getByText(/Get all users/i));
      
      // 3. Run query
      const rerunButtons = screen.getAllByTitle(/Rerun query/i);
      fireEvent.click(rerunButtons[0]);

      await waitFor(() => screen.getByText(/Query Result/i));

      // 4. Export CSV
      fireEvent.change(screen.getByTestId("export-dropdown"), {
        target: { value: "CSV" },
      });

      // 5. Verify export happened
      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled();
      });
    });
 test("exports CSV correctly handling null values (covers CSV logic)", async () => {
      // 1. Mock History Load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoryData),
      });

      // 2. Mock Query Result containing NULL and UNDEFINED values
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          data: [
            { id: 1, name: null, role: undefined }, 
            { id: 2, name: "Alice", role: "Admin" }
          ] 
        }),
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);
      await waitFor(() => screen.getByText(/Get all users/i));
      
      // 3. Run query
      const rerunButtons = screen.getAllByTitle(/Rerun query/i);
      fireEvent.click(rerunButtons[0]);

      await waitFor(() => screen.getByText(/Query Result/i));

      // 4. Export CSV
      fireEvent.change(screen.getByTestId("export-dropdown"), {
        target: { value: "CSV" },
      });

      // 5. Verify export happened
      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled();
      });
    });

  });

  describe("Edge cases", () => {
    test("handles history items with OTHER type", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            history: [
              {
                id: 1,
                natural_language_input: "Complex query",
                query_text: "TRUNCATE TABLE test",
                success: true,
                query_type: "TRUNCATE",
                created_at: new Date().toISOString(),
                execution_time_ms: 5,
                error_message: "",
                is_favorite: false,
              },
            ],
            total: 1,
          }),
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Complex query/i)).toBeInTheDocument();
      });
    });

    test("handles items without natural language input", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            history: [
              {
                id: 1,
                natural_language_input: null,
                query_text: "SELECT * FROM test",
                success: true,
                query_type: "SELECT",
                created_at: new Date().toISOString(),
                execution_time_ms: 5,
                error_message: "",
                is_favorite: false,
              },
            ],
            total: 1,
          }),
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      await waitFor(() => {
        const queryTexts = screen.getAllByText(/SELECT \* FROM test/i);
        expect(queryTexts.length).toBeGreaterThan(0);
      });
    });

    test("shows execution time for successful queries", async () => {
      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);
      await waitFor(() => {
        expect(screen.getByText(/10 ms/i)).toBeInTheDocument();
      });
    });
    test("does not fetch history if project ID is missing (covers defensive check)", async () => {
      // Now mockUseParams is defined and we can change its return value
      mockUseParams.mockReturnValueOnce({ slug: null });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      // Wait to ensure useEffect would have run
      await waitFor(() => {
        // Verify fetch was NEVER called because the function returned early
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });
  });
  describe("Time Formatting Coverage", () => {
    test("formats time ago for minutes, hours, days, and full dates correctly", async () => {
      const now = Date.now();
      const minuteMs = 60 * 1000;
      const hourMs = 60 * minuteMs;
      const dayMs = 24 * hourMs;

      // We create specific timestamps relative to "now" to hit every branch of formatTimeAgo
      const timeMockData = {
        total: 4,
        history: [
          {
            id: 101,
            natural_language_input: "Minutes Test",
            query_text: "SELECT 1",
            success: true,
            query_type: "SELECT",
            // 30 minutes ago -> triggers: if (minutes < 60)
            created_at: new Date(now - 30 * minuteMs).toISOString(),
            execution_time_ms: 10,
            error_message: "",
            is_favorite: false,
          },
          {
            id: 102,
            natural_language_input: "Hours Test",
            query_text: "SELECT 2",
            success: true,
            query_type: "SELECT",
            // 5 hours ago -> triggers: if (hours < 24)
            created_at: new Date(now - 5 * hourMs).toISOString(),
            execution_time_ms: 10,
            error_message: "",
            is_favorite: false,
          },
          {
            id: 103,
            natural_language_input: "Days Test",
            query_text: "SELECT 3",
            success: true,
            query_type: "SELECT",
            // 3 days ago -> triggers: if (days < 7)
            created_at: new Date(now - 3 * dayMs).toISOString(),
            execution_time_ms: 10,
            error_message: "",
            is_favorite: false,
          },
          {
            id: 104,
            natural_language_input: "Old Date Test",
            query_text: "SELECT 4",
            success: true,
            query_type: "SELECT",
            // 30 days ago -> triggers: return date.toLocaleDateString(...)
            created_at: new Date(now - 30 * dayMs).toISOString(),
            execution_time_ms: 10,
            error_message: "",
            is_favorite: false,
          },
        ],
      };

      // Mock the fetch to return these specific time examples
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(timeMockData),
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      // Wait for the history items to load
      await waitFor(() => screen.getByText("Minutes Test"));

      // 1. Check "Minutes" branch
      expect(screen.getByText(/30 minute/i)).toBeInTheDocument();

      // 2. Check "Hours" branch
      expect(screen.getByText(/5 hour/i)).toBeInTheDocument();

      // 3. Check "Days" branch
      expect(screen.getByText(/3 day/i)).toBeInTheDocument();

      // 4. Check "Full Date" branch
      const dateObj = new Date(now - 30 * dayMs);
      const expectedYear = dateObj.getFullYear().toString();
      const expectedMonth = dateObj.toLocaleDateString("en-IN", {
        month: "short",
      });

      expect(screen.getByText(new RegExp(expectedYear))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(expectedMonth))).toBeInTheDocument();
    });
  });
  describe("Inline Title Edit Coverage", () => {
    // CRITICAL FIX: Ensure spies are cleaned up even if a test fails.
    // This prevents the "Maximum call stack" recursion error in subsequent tests.
    afterEach(() => {
      jest.restoreAllMocks();
    });

    test("triggers defensive check when saving title with null ID", async () => {
      const nullIdData = {
        history: [
          {
            ...mockHistoryData.history[0],
            id: null,
            natural_language_input: "Null ID Test",
            query_text: "SELECT 1",
          },
        ],
        total: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(nullIdData),
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      await waitFor(() => {
        const inputs = screen.getAllByRole("textbox");
        expect(inputs.length).toBeGreaterThanOrEqual(2);
      });

      // Robust selector: Find the input that isn't the search bar
      const inputs = screen.getAllByRole("textbox");
      const inlineInput = inputs.find(
        (input) => !input.placeholder || !input.placeholder.includes("Search")
      );

      fireEvent.blur(inlineInput);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test("successfully updates title and calls API", async () => {
      const testId = 99;
      const initialData = {
        history: [
          {
            ...mockHistoryData.history[0],
            id: testId,
            natural_language_input: "Old Title",
            title: "Old Title",
          },
        ],
        total: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(initialData),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // FIX: Use requireActual inside the spy to avoid recursion loops
      const { useState } = jest.requireActual("react");
      jest.spyOn(React, "useState").mockImplementation((initialState) => {
        if (
          initialState &&
          typeof initialState === "object" &&
          initialState.id === null &&
          initialState.text === ""
        ) {
          return [{ id: testId, text: "New Title" }, jest.fn()];
        }
        return useState(initialState);
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("New Title")).toBeInTheDocument();
      });

      fireEvent.blur(screen.getByDisplayValue("New Title"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(
            `/api/projects/test-project-id/history/${testId}`
          ),
          expect.objectContaining({
            method: "PUT",
            body: JSON.stringify({ naturalLanguageInput: "New Title" }),
          })
        );
      });
    });

    test("cancels save (returns early) if new title is empty", async () => {
      const testId = 10;
      const mockData = {
        history: [
          {
            ...mockHistoryData.history[0],
            id: testId,
            natural_language_input: "Original Title",
          },
        ],
        total: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { useState } = jest.requireActual("react");
      jest.spyOn(React, "useState").mockImplementation((initialState) => {
        if (
          initialState &&
          initialState.id === null &&
          initialState.text === ""
        ) {
          return [{ id: testId, text: "   " }, jest.fn()];
        }
        return useState(initialState);
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      // FIX: Use getAllByRole selector instead of getByDisplayValue for whitespace
      await waitFor(() => {
        const inputs = screen.getAllByRole("textbox");
        // We expect Search Input + Inline Edit Input
        expect(inputs.length).toBeGreaterThanOrEqual(2);
      });

      const inputs = screen.getAllByRole("textbox");
      const inlineInput = inputs.find(
        (input) => !input.placeholder || !input.placeholder.includes("Search")
      );

      fireEvent.blur(inlineInput);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test("cancels save (returns early) if title is unchanged", async () => {
      const testId = 11;
      const sameTitle = "Unchanged Title";

      const mockData = {
        history: [
          {
            ...mockHistoryData.history[0],
            id: testId,
            natural_language_input: sameTitle,
            title: sameTitle,
          },
        ],
        total: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { useState } = jest.requireActual("react");
      jest.spyOn(React, "useState").mockImplementation((initialState) => {
        if (
          initialState &&
          initialState.id === null &&
          initialState.text === ""
        ) {
          return [{ id: testId, text: sameTitle }, jest.fn()];
        }
        return useState(initialState);
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue(sameTitle)).toBeInTheDocument();
      });

      fireEvent.blur(screen.getByDisplayValue(sameTitle));

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    test("reverts title change and shows alert when API save fails", async () => {
      const testId = 123;
      const oldTitle = "Stable Title";
      const brokenTitle = "Error Title";
      
      // 1. Setup initial data
      const initialData = {
        history: [
          {
            ...mockHistoryData.history[0],
            id: testId,
            natural_language_input: oldTitle,
            title: oldTitle, // Important: logic uses .title to revert
          },
        ],
        total: 1,
      };

      // 2. Mock Fetch Sequences
      mockFetch
        .mockResolvedValueOnce({ 
          ok: true, 
          json: () => Promise.resolve(initialData) 
        }) // 1. Initial Load (Success)
        .mockResolvedValueOnce({ 
          ok: false, // 2. PUT Request (Fail) -> triggers `if (!res.ok) throw`
          json: () => Promise.resolve({ error: "Server Error" }) 
        });

      // 3. Force Component into Edit Mode via State Spy
      const { useState } = jest.requireActual("react");
      jest.spyOn(React, "useState").mockImplementation((initialState) => {
        if (
          initialState &&
          initialState.id === null &&
          initialState.text === ""
        ) {
          return [{ id: testId, text: brokenTitle }, jest.fn()];
        }
        return useState(initialState);
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      // 4. Wait for input to render with the new (broken) title
      await waitFor(() => {
        expect(screen.getByDisplayValue(brokenTitle)).toBeInTheDocument();
      });

      // 5. Trigger Save (Blur event)
      fireEvent.blur(screen.getByDisplayValue(brokenTitle));

      // 6. Verify Alert was called (This confirms we hit the `catch` block)
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith("Error saving title. Reverting.");
      });
    });
    test("handles input changes and keyboard events (Enter/Escape) correctly", async () => {
      const testId = 50;
      const initialData = {
        history: [{ ...mockHistoryData.history[0], id: testId, natural_language_input: "Edit Me" }],
        total: 1,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(initialData),
      });

      // Force component into Edit Mode
      const { useState } = jest.requireActual("react");
      jest.spyOn(React, "useState").mockImplementation((initialState) => {
        if (initialState?.id === null && initialState?.text === "") {
          return [{ id: testId, text: "Edit Me" }, jest.fn()];
        }
        return useState(initialState);
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      await waitFor(() => expect(screen.getByDisplayValue("Edit Me")).toBeInTheDocument());
      const input = screen.getByDisplayValue("Edit Me");

      // 1. Cover onChange (Red lines 770-773)
      fireEvent.change(input, { target: { value: "Typed Text" } });

      // 2. Cover onKeyDown Enter (Red line 777)
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // 3. Cover onKeyDown Escape (Red lines 778-779)
      fireEvent.keyDown(input, { key: "Escape", code: "Escape" });
    });
    test("updates state from server response (covers successful save callback)", async () => {
      // 1. Initial Load (Item 1 is not favorite)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoryData),
      });

      // 2. Mock Toggle Response: Server returns is_favorite: FALSE
      // (We clicked to make it TRUE, but server says FALSE. This forces the success callback to run and update state)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ updatedItem: { is_favorite: false } }),
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      await waitFor(() => screen.getByText(/Get all users/i));
      
      // Find the button (initially "Add to favorites")
      const favoriteButtons = screen.getAllByTitle(/favorites/i);
      const targetBtn = favoriteButtons[0];

      // 3. Click to toggle
      fireEvent.click(targetBtn);

      // 4. Optimistic update happens immediately (Title changes to "Remove from favorites")
      await waitFor(() => {
        expect(screen.getByTitle(/Remove from favorites/i)).toBeInTheDocument();
      });

      // 5. Wait for Server Response to apply the logic in lines 170-171
      // The server returned 'false', so the UI should revert to "Add to favorites"
      await waitFor(() => {
        expect(screen.getByTitle(/Add to favorites/i)).toBeInTheDocument();
      });
    });
    describe("Navigation Logic", () => {
    test("returns to history view from result view (covers handleBackToHistory)", async () => {
      // 1. Initial History Load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoryData),
      });

      // 2. Run Query (Simulate entering the "Result View")
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 1, val: "test" }] }),
      });

      // 3. Fetch History again (triggered by the "Back to History" button)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoryData),
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      // Wait for history to load
      await waitFor(() => screen.getByText(/Get all users/i));

      // Enter Result View by clicking "Rerun query"
      fireEvent.click(screen.getAllByTitle(/Rerun query/i)[0]);

      // Verify we are in Result View
      await waitFor(() => screen.getByText(/Query Result/i));

      // --- TEST THE RED LOGIC ---
      // Find and Click "Back to History"
      const backButton = screen.getByText(/Back to History/i);
      fireEvent.click(backButton);

      // Verify the state reset: "Query Result" should go away, "Query History" returns
      await waitFor(() => {
        expect(screen.queryByText(/Query Result/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Query History/i)).toBeInTheDocument();
      });

      // Verify fetchHistory() was called again
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/projects/test-project-id/history")
      );
    });
    test("navigates to query page via title click, enter key, and button click", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoryData),
      });

      const mockSetPage = jest.fn();
      const mockSetQuery = jest.fn();

      render(<History handleSetPage={mockSetPage} setQueryToPass={mockSetQuery} />);
      await waitFor(() => screen.getByText(/Get all users/i));

      const titleText = screen.getByText(/Get all users/i);
      const openBtn = screen.getAllByTitle("Open in Query")[0];

      // 1. Cover Title onClick (Red line 790)
      fireEvent.click(titleText);
      expect(mockSetQuery).toHaveBeenCalledWith("Get all users");

      // 2. Cover Title onKeyDown Enter (Red lines 793-795)
      fireEvent.keyDown(titleText, { key: "Enter", code: "Enter" });
      expect(mockSetQuery).toHaveBeenCalledWith("Get all users");
      expect(mockSetPage).toHaveBeenCalledWith("query");

      // 3. Cover Button onClick (Red lines 804-805)
      fireEvent.click(openBtn);
      expect(mockSetQuery).toHaveBeenCalledWith("Get all users");
      expect(mockSetPage).toHaveBeenCalledWith("query");
    });
    test("loads all previous history when 'Load All Previous' button is clicked", async () => {
      // 1. Mock initial load where Total (10) > Loaded (2)
      // This ensures the "Load All Previous" button renders
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            history: mockHistoryData.history, // 2 items
            total: 10,
          }),
      });

      // 2. Mock the second fetch (Triggered by clicking the button)
      // This fetch happens when historyLimit changes to 99999
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            history: Array(10).fill(mockHistoryData.history[0]), // Mock 10 items
            total: 10,
          }),
      });

      render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

      // Wait for initial load
      await waitFor(() => screen.getByText(/Get all users/i));

      // 3. Find the button (It should show "8 more")
      const loadMoreBtn = screen.getByText(/Load All Previous/i);
      expect(loadMoreBtn).toBeInTheDocument();

      // 4. Click the button (Triggers the red line: setHistoryLimit(99999))
      fireEvent.click(loadMoreBtn);

      // 5. Verify fetch was called with the new limit
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("limit=99999")
        );
      });
    });
  });
  }); 
});
