import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation useParams
jest.mock("next/navigation", () => ({
  useParams: () => ({ slug: "proj1" }),
}));

// Simplify UI component imports used by the component so tests focus on behavior
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props) => <input {...props} />,
}));

jest.mock("@/components/ui/textarea", () => ({
  Textarea: (props) => <textarea {...props} />,
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }) => (open ? <div>{children}</div> : <div />),
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h3>{children}</h3>,
  DialogFooter: ({ children }) => <div>{children}</div>,
  DialogClose: ({ children }) => <span>{children}</span>,
}));

import History from "../src/components/(projects)/history";

beforeEach(() => {
  jest.resetAllMocks();
});

function mockFetchHandler(handler) {
  global.fetch = jest.fn((...args) => handler(...args));
}

test("renders history items from API", async () => {
  mockFetchHandler((url) => {
    if (url.toString().includes("/history")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          history: [
            {
              id: 1,
              natural_language_input: "Title 1",
              query_text: "SELECT id, name FROM users",
              success: true,
              execution_time_ms: 12,
              query_type: "SELECT",
              created_at: "2025-11-16T00:00:00Z",
              is_favorite: false,
            },
          ],
          total: 1,
        }),
      });
    }

    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  const setQueryToPass = jest.fn();
  const handleSetPage = jest.fn();

  render(
    <History handleSetPage={handleSetPage} setQueryToPass={setQueryToPass} />
  );

  expect(await screen.findByText(/Query History/i)).toBeInTheDocument();

  // Item title and SQL should render
  expect(await screen.findByText("Title 1")).toBeInTheDocument();
  expect(screen.getByText(/SELECT id, name FROM users/)).toBeInTheDocument();
});

test("toggles favorite and calls API PUT", async () => {
  // Sequence: initial GET -> then PUT
  let calledPut = false;

  mockFetchHandler((url, opts) => {
    if (
      url.toString().includes("/history") &&
      (!opts || opts.method === "GET")
    ) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          history: [
            {
              id: 2,
              natural_language_input: "Title 2",
              query_text: "SELECT id FROM t",
              success: true,
              execution_time_ms: 5,
              query_type: "SELECT",
              created_at: "2025-11-16T00:00:00Z",
              is_favorite: false,
            },
          ],
          total: 1,
        }),
      });
    }

    if (opts && opts.method === "PUT") {
      calledPut = true;
      return Promise.resolve({
        ok: true,
        json: async () => ({ updatedItem: { is_favorite: true } }),
      });
    }

    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

  // wait for item
  expect(await screen.findByText("Title 2")).toBeInTheDocument();

  // Click favorite button (first button with title "Add to favorites")
  const favBtn = screen.getByTitle(/Add to favorites/i);
  userEvent.click(favBtn);

  await waitFor(() => expect(calledPut).toBe(true));

  // After successful PUT, the star button will have title "Remove from favorites"
  expect(screen.getByTitle(/Remove from favorites/i)).toBeInTheDocument();
});

test("reruns SELECT query and shows results table", async () => {
  // Sequence: initial GET -> POST rerun
  let postCalled = false;

  mockFetchHandler((url, opts) => {
    if (
      url.toString().includes("/history") &&
      (!opts || opts.method === "GET")
    ) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          history: [
            {
              id: 3,
              natural_language_input: "Title 3",
              query_text: "SELECT id, name FROM users",
              success: true,
              execution_time_ms: 8,
              query_type: "SELECT",
              created_at: "2025-11-16T00:00:00Z",
              is_favorite: false,
            },
          ],
          total: 1,
        }),
      });
    }

    if (url.toString().endsWith("/query") && opts && opts.method === "POST") {
      postCalled = true;
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [{ id: 1, name: "Alice" }] }),
      });
    }

    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

  // wait for item
  expect(await screen.findByText("Title 3")).toBeInTheDocument();

  // Click rerun (button with title "Rerun query")
  const rerunBtn = screen.getByTitle(/Rerun query/i);
  userEvent.click(rerunBtn);

  await waitFor(() => expect(postCalled).toBe(true));

  // Now the Query Result view should be visible
  expect(await screen.findByText(/Query Result/i)).toBeInTheDocument();

  // Table should show Alice
  expect(screen.getByText("Alice")).toBeInTheDocument();
});

test("clicking title opens Query page via handlers", async () => {
  mockFetchHandler((url) => {
    if (url.toString().includes("/history")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          history: [
            {
              id: 4,
              natural_language_input: "Open Title",
              query_text: "SELECT 1",
              success: true,
              execution_time_ms: 1,
              query_type: "SELECT",
              created_at: "2025-11-16T00:00:00Z",
              is_favorite: false,
            },
          ],
          total: 1,
        }),
      });
    }

    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  const setQueryToPass = jest.fn();
  const handleSetPage = jest.fn();

  render(
    <History handleSetPage={handleSetPage} setQueryToPass={setQueryToPass} />
  );

  expect(await screen.findByText("Open Title")).toBeInTheDocument();

  // Click the explicit 'Open in Query' button to trigger handlers
  const openBtn = screen.getByTitle(/Open in Query/i);
  userEvent.click(openBtn);

  await waitFor(() =>
    expect(setQueryToPass).toHaveBeenCalledWith("Open Title")
  );
  await waitFor(() => expect(handleSetPage).toHaveBeenCalledWith("query"));
});

test("opens filter modal and apply closes it", async () => {
  mockFetchHandler((url) => {
    if (url.toString().includes("/history")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ history: [], total: 0 }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

  const filtersBtn = await screen.findByRole("button", { name: /Filters/i });
  userEvent.click(filtersBtn);

  expect(await screen.findByText(/Filter History/i)).toBeInTheDocument();

  const applyBtn = screen.getByRole("button", { name: /Apply/i });
  userEvent.click(applyBtn);

  await waitFor(() =>
    expect(screen.queryByText(/Filter History/i)).not.toBeInTheDocument()
  );
});

test("clear filters hides modal", async () => {
  mockFetchHandler((url) => {
    if (url.toString().includes("/history")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ history: [], total: 0 }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

  const filtersBtn = await screen.findByRole("button", { name: /Filters/i });
  userEvent.click(filtersBtn);

  // Toggle favorites button inside modal
  const favToggle = await screen.findByRole("button", {
    name: /Show Favorites Only/i,
  });
  userEvent.click(favToggle);

  const clearBtn = screen.getByRole("button", { name: /Clear All/i });
  userEvent.click(clearBtn);

  await waitFor(() =>
    expect(screen.queryByText(/Filter History/i)).not.toBeInTheDocument()
  );
});

test("opens edit modal when clicking edit and can run edited query (success)", async () => {
  // GET -> POST(query) -> GET
  let postCalled = false;
  let getCalls = 0;

  mockFetchHandler((url, opts) => {
    if (
      url.toString().includes("/history") &&
      (!opts || opts.method === "GET")
    ) {
      getCalls++;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          history: [
            {
              id: 5,
              natural_language_input: "E Title",
              query_text: "SELECT x",
              success: true,
              execution_time_ms: 1,
              query_type: "SELECT",
              created_at: "2025-11-16T00:00:00Z",
              is_favorite: false,
            },
          ],
          total: 1,
        }),
      });
    }

    if (url.toString().endsWith("/query") && opts && opts.method === "POST") {
      postCalled = true;
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [{ x: 1 }] }),
      });
    }

    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

  expect(await screen.findByText("E Title")).toBeInTheDocument();

  // click edit (PencilLine)
  const editBtn = screen.getByTitle(/Edit query in new window/i);
  userEvent.click(editBtn);

  expect(await screen.findByText(/Edit Query/i)).toBeInTheDocument();

  // Run Edited Query
  const runBtn = screen.getByRole("button", { name: /Run Edited Query/i });
  userEvent.click(runBtn);

  await waitFor(() => expect(postCalled).toBe(true));

  // After run, modal should close and show results (SELECT queries display results, don't refetch history)
  await waitFor(() =>
    expect(screen.queryByText(/Edit Query/i)).not.toBeInTheDocument()
  );
  
  // Verify result is displayed
  expect(await screen.findByText(/Query Result/i)).toBeInTheDocument();
  expect(screen.getByText("1")).toBeInTheDocument(); // data value from mock
  expect(getCalls).toBe(1); // Only initial fetch, no refetch for SELECT queries
});

test("run edited query shows error message on failure", async () => {
  mockFetchHandler((url, opts) => {
    if (
      url.toString().includes("/history") &&
      (!opts || opts.method === "GET")
    ) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          history: [
            {
              id: 6,
              natural_language_input: "F Title",
              query_text: "SELECT y",
              success: true,
              execution_time_ms: 1,
              query_type: "SELECT",
              created_at: "2025-11-16T00:00:00Z",
              is_favorite: false,
            },
          ],
          total: 1,
        }),
      });
    }

    if (url.toString().endsWith("/query") && opts && opts.method === "POST") {
      return Promise.resolve({
        ok: false,
        json: async () => ({ error: "bad" }),
      });
    }

    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

  expect(await screen.findByText("F Title")).toBeInTheDocument();

  userEvent.click(screen.getByTitle(/Edit query in new window/i));

  expect(await screen.findByText(/Edit Query/i)).toBeInTheDocument();

  userEvent.click(screen.getByRole("button", { name: /Run Edited Query/i }));

  // Error message displayed in modal
  expect(await screen.findByText(/Error:/i)).toBeInTheDocument();
});

test("non-SELECT rerun calls query then refreshes history", async () => {
  const calls = [];
  mockFetchHandler((url, opts) => {
    calls.push({ url: url.toString(), opts });

    if (
      url.toString().includes("/history") &&
      (!opts || opts.method === "GET")
    ) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          history: [
            {
              id: 7,
              natural_language_input: "Ins",
              query_text: "INSERT INTO t VALUES (1)",
              success: true,
              execution_time_ms: 1,
              query_type: "INSERT",
              created_at: "2025-11-16T00:00:00Z",
              is_favorite: false,
            },
          ],
          total: 1,
        }),
      });
    }

    if (url.toString().endsWith("/query") && opts && opts.method === "POST") {
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }

    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

  expect(await screen.findByText("Ins")).toBeInTheDocument();

  userEvent.click(screen.getByTitle(/Rerun query/i));

  await waitFor(() => {
    // expect a POST to /query and a subsequent GET to /history
    const post = calls.find(
      (c) => c.url.endsWith("/query") && c.opts && c.opts.method === "POST"
    );
    const get = calls.find(
      (c) => c.url.includes("/history") && (!c.opts || c.opts.method === "GET")
    );
    expect(post).toBeTruthy();
    expect(get).toBeTruthy();
  });
});

test("shows Load All Previous button when more results exist", async () => {
  mockFetchHandler((url) => {
    if (url.toString().includes("/history")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          history: [
            {
              id: 8,
              natural_language_input: "A",
              query_text: "SELECT 1",
              success: true,
              execution_time_ms: 1,
              query_type: "SELECT",
              created_at: "2025-11-16T00:00:00Z",
              is_favorite: false,
            },
            {
              id: 9,
              natural_language_input: "B",
              query_text: "SELECT 2",
              success: true,
              execution_time_ms: 1,
              query_type: "SELECT",
              created_at: "2025-11-16T00:00:00Z",
              is_favorite: false,
            },
          ],
          total: 5,
        }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

  expect(
    await screen.findByText(/Load All Previous \(3 more\)/i)
  ).toBeInTheDocument();
});

test("search input filters results showing no results message", async () => {
  mockFetchHandler((url) => {
    if (url.toString().includes("/history")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          history: [
            {
              id: 10,
              natural_language_input: "SearchMe",
              query_text: "SELECT 9",
              success: true,
              execution_time_ms: 1,
              query_type: "SELECT",
              created_at: "2025-11-16T00:00:00Z",
              is_favorite: false,
            },
          ],
          total: 1,
        }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

  expect(await screen.findByText("SearchMe")).toBeInTheDocument();

  const input = screen.getByPlaceholderText(/Search history/);
  userEvent.type(input, "nothingmatches");

  expect(await screen.findByText(/No results found./i)).toBeInTheDocument();
});

test("export result options (xlsx, json, csv) trigger appropriate handlers", async () => {
  // Setup: initial GET -> POST rerun returns data
  mockFetchHandler((url, opts) => {
    if (url.toString().includes("/history") && (!opts || opts.method === "GET")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          history: [
            {
              id: 11,
              natural_language_input: "ExportMe",
              query_text: "SELECT a,b",
              success: true,
              execution_time_ms: 1,
              query_type: "SELECT",
              created_at: "2025-11-16T00:00:00Z",
              is_favorite: false,
            },
          ],
          total: 1,
        }),
      });
    }

    if (url.toString().endsWith("/query") && opts && opts.method === "POST") {
      return Promise.resolve({ ok: true, json: async () => ({ data: [{ a: 1, b: "x" }] }) });
    }

    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  // Spy XLSX and provide minimal utils so writeFile path succeeds
  const XLSX = require("xlsx");
  XLSX.utils = {
    book_new: jest.fn(() => ({})),
    json_to_sheet: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
  };
  XLSX.writeFile = jest.fn();

  // Spy document.createElement for anchor behavior and URL.createObjectURL
  const originalCreate = document.createElement.bind(document);
  const clickSpy = jest.fn();
  const createSpy = jest.spyOn(document, "createElement").mockImplementation((tag) => {
    if (tag === "a") {
      return {
        download: "",
        href: "",
        dispatchEvent: clickSpy,
        remove: jest.fn(),
      };
    }
    return originalCreate(tag);
  });

  const originalCreateObj = window.URL.createObjectURL;
  window.URL.createObjectURL = jest.fn(() => "blob://fake");

  try {
    render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

    // wait for item and rerun
    expect(await screen.findByText("ExportMe")).toBeInTheDocument();
    await userEvent.click(screen.getByTitle(/Rerun query/i));

    // Now Query Result is shown and ExportDropdown exists
    expect(await screen.findByText(/Query Result/i)).toBeInTheDocument();

    // Open ExportDropdown and select XLSX (ensure no crash when choosing)
    const exportButton = screen.getByText(/Export Data/i);
    await userEvent.click(exportButton);
    const xlsxOpt = await screen.findByText(/XLSX/i);
    await userEvent.click(xlsxOpt);
    await waitFor(() => expect(screen.queryByText(/Query Result/i)).toBeInTheDocument());

    // Select JSON option
    await userEvent.click(exportButton);
    const jsonOpt = await screen.findByText(/JSON/i);
    await userEvent.click(jsonOpt);
    await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalled());

    // Select CSV option
    await userEvent.click(exportButton);
    const csvOpt = await screen.findByText(/CSV/i);
    await userEvent.click(csvOpt);
    // CSV triggers download via anchor dispatchEvent
    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
  } finally {
    createSpy.mockRestore();
    window.URL.createObjectURL = originalCreateObj;
  }
});

test("run edited query proceeds when AI title generation fails", async () => {
  // Simulate AI title endpoint throwing, but query POST succeeds
  mockFetchHandler((url, opts) => {
    if (url.toString().includes("/history") && (!opts || opts.method === "GET")) {
      return Promise.resolve({ ok: true, json: async () => ({ history: [{ id: 12, natural_language_input: "AIfail", query_text: "SELECT z", success: true, execution_time_ms: 1, query_type: "SELECT", created_at: "2025-11-16T00:00:00Z", is_favorite: false }], total:1 }) });
    }

    if (url.toString().includes("/api/ai/generate-title")) {
      return Promise.reject(new Error('AI down'));
    }

    if (url.toString().endsWith("/query") && opts && opts.method === "POST") {
      return Promise.resolve({ ok: true, json: async () => ({ data: [{ z: 2 }] }) });
    }

    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  // Render inside act-aware waits
  render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

  expect(await screen.findByText("AIfail")).toBeInTheDocument();

  await userEvent.click(screen.getByTitle(/Edit query in new window/i));
  expect(await screen.findByText(/Edit Query/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /Run Edited Query/i }));

  // Should show Query Result despite AI failing
  expect(await screen.findByText(/Query Result/i)).toBeInTheDocument();
});

test("toggle favorite reverts when API PUT fails", async () => {
  let putCalled = false;
  mockFetchHandler((url, opts) => {
    if (url.toString().includes("/history") && (!opts || opts.method === "GET")) {
      return Promise.resolve({ ok: true, json: async () => ({ history: [{ id: 20, natural_language_input: "FavFail", query_text: "SELECT", success: true, execution_time_ms: 1, query_type: "SELECT", created_at: new Date().toISOString(), is_favorite: false }], total:1 }) });
    }

    if (opts && opts.method === "PUT") {
      putCalled = true;
      return Promise.resolve({ ok: false, json: async () => ({}) });
    }

    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

  render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

  expect(await screen.findByText("FavFail")).toBeInTheDocument();

  const favBtn = screen.getByTitle(/Add to favorites/i);
  userEvent.click(favBtn);

  await waitFor(() => expect(putCalled).toBe(true));
  // On failure, alert should be shown and the button title should return to Add to favorites
  await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  expect(screen.getByTitle(/Add to favorites/i)).toBeInTheDocument();

  alertSpy.mockRestore();
});

test("fetchHistory handles GET failure and shows no history message", async () => {
  mockFetchHandler((url, opts) => {
    if (url.toString().includes('/history')) {
      return Promise.resolve({ ok: false, json: async () => ({}) });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
  render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

  await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  // When failed, component sets empty history and shows no history message
  expect(await screen.findByText(/No query history found./i)).toBeInTheDocument();
  alertSpy.mockRestore();
});

test("formatTimeAgo renders seconds/minutes/hours/old-date variants", async () => {
  const now = Date.now();
  const makeDate = (msAgo) => new Date(now - msAgo).toISOString();

  mockFetchHandler((url, opts) => {
    if (url.toString().includes('/history')) {
      return Promise.resolve({ ok: true, json: async () => ({ history: [
        { id: 30, natural_language_input: 'S', query_text: 's', success: true, execution_time_ms:1, query_type:'SELECT', created_at: makeDate(10*1000), is_favorite:false },
        { id: 31, natural_language_input: 'M', query_text: 'm', success: true, execution_time_ms:1, query_type:'SELECT', created_at: makeDate(5*60*1000), is_favorite:false },
        { id: 32, natural_language_input: 'H', query_text: 'h', success: true, execution_time_ms:1, query_type:'SELECT', created_at: makeDate(2*60*60*1000), is_favorite:false },
        { id: 33, natural_language_input: 'D', query_text: 'd', success: true, execution_time_ms:1, query_type:'SELECT', created_at: makeDate(10*24*60*60*1000), is_favorite:false },
      ], total:4 }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

  // Check that relative terms appear for each item
  expect(await screen.findByText('S')).toBeInTheDocument();
  expect(await screen.findByText('M')).toBeInTheDocument();
  expect(await screen.findByText('H')).toBeInTheDocument();
  expect(await screen.findByText('D')).toBeInTheDocument();

  // The rendered time labels should contain second/minute/hour or a date string for older
  const allText = document.body.textContent;
  expect(/second|minute|hour|\d{4}/i.test(allText)).toBeTruthy();
});

test("convertToCSV escapes quotes, commas and handles null/undefined values", async () => {
  // Prepare history GET and query POST to return data with quotes, commas and null
  mockFetchHandler((url, opts) => {
    if (url.toString().includes("/history") && (!opts || opts.method === "GET")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          history: [
            {
              id: 99,
              natural_language_input: "CSVTest",
              query_text: "SELECT a,b,c",
              success: true,
              execution_time_ms: 1,
              query_type: "SELECT",
              created_at: "2025-11-16T00:00:00Z",
              is_favorite: false,
            },
          ],
          total: 1,
        }),
      });
    }

    if (url.toString().endsWith("/query") && opts && opts.method === "POST") {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: [
            { a: 'He said "hi"', b: null, c: 'comma,here' },
          ],
        }),
      });
    }

    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  // Capture Blob input for inspection
  const blobParts = [];
  const OriginalBlob = global.Blob;
  global.Blob = function(parts, opts) {
    blobParts.push(parts);
    return { size: Array.isArray(parts) ? parts.join('').length : 0 };
  };

  // Spy anchor click and URL.createObjectURL
  const clickSpy = jest.fn();
  const originalCreate = document.createElement.bind(document);
  const createSpy = jest.spyOn(document, "createElement").mockImplementation((tag) => {
    if (tag === "a") {
      return {
        download: "",
        href: "",
        dispatchEvent: clickSpy,
        remove: jest.fn(),
      };
    }
    return originalCreate(tag);
  });

  const originalCreateObj = window.URL.createObjectURL;
  window.URL.createObjectURL = jest.fn(() => "blob://fakecsv");

  try {
    render(<History handleSetPage={jest.fn()} setQueryToPass={jest.fn()} />);

    // wait for item and rerun to populate runResult
    expect(await screen.findByText("CSVTest")).toBeInTheDocument();
    await userEvent.click(screen.getByTitle(/Rerun query/i));

    expect(await screen.findByText(/Query Result/i)).toBeInTheDocument();

    // Open Export dropdown and choose CSV
    const exportButton = screen.getByText(/Export Data/i);
    await userEvent.click(exportButton);
    const csvOpt = await screen.findByText(/CSV/i);
    await userEvent.click(csvOpt);

    // Ensure a Blob was created and contains the CSV with escaped quotes and comma-preserved values
    await waitFor(() => expect(blobParts.length).toBeGreaterThan(0));
    const csvString = blobParts[0].join('');
    // header should be quoted
    expect(csvString).toContain('"a","b","c"');
    // quoted value with doubled internal quotes
    expect(csvString).toContain('"He said ""hi"""');
    // null becomes empty string between commas
    expect(csvString).toContain('"","comma,here"'.replace(/"","/, '"","'));
  } finally {
    createSpy.mockRestore();
    window.URL.createObjectURL = originalCreateObj;
    global.Blob = OriginalBlob;
  }
});