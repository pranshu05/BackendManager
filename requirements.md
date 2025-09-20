# Functional Requirements for DBuddy



## 1. User Management (FR-UM)

| ID          | Requirement                                                              |
| :---------- | :----------------------------------------------------------------------- |
| **FR-UM-001** | The system shall allow new users to create an account (sign up).         |
| **FR-UM-002** | The system shall allow registered users to log in with their credentials. |
| **FR-UM-003** | The system shall provide a secure method for user authentication.        |
| **FR-UM-004** | The system shall allow logged-in users to log out.                       |
| **FR-UM-005** | The system shall manage user sessions to control access to protected areas.|

> **Source (Elicitation):** Non-technical users expressed the need for easy, self-service access to the application without requiring IT assistance.

---

## 2. Project & Database Management (FR-DB)

| ID          | Requirement                                                                                             |
| :---------- | :------------------------------------------------------------------------------------------------------ |
| **FR-DB-001** | The system shall allow a user to create a new, empty PostgreSQL database from the dashboard.            |
| **FR-DB-002** | The system shall display a list of all user-created projects/databases on the dashboard.                |
| **FR-DB-003** | The system shall provide a search interface to filter the project list by name.                         |
| **FR-DB-004** | The system shall display the schema of a selected database, including table names and their columns.    |
| **FR-DB-005** | The system shall allow users to create a new table in the database schema.                              |
| **FR-DB-006** | The system shall allow users to view data from a table (Read).                                          |
| **FR-DB-007** | The system shall allow users to insert new rows into a table (Create).                                  |
| **FR-DB-008** | The system shall allow users to update existing rows in a table (Update).                               |
| **FR-DB-009** | The system shall allow users to delete rows from a table (Delete).                                      |
| **FR-DB-010** | The system shall allow users to automatically generate and populate database tables with mock data.     |
| **FR-DB-011** | The system shall allow users to export query results into CSV format.                                   |
| **FR-DB-012** | The system shall allow users to export query results into JSON format.                                  |

> **Source (Elicitation):** Non-technical users, through interviews and team brainstorming, identified the core operations and features required for effective database interaction.

---

## 3. Natural Language Processing (NLP) Querying (FR-NLP)

| ID          | Requirement                                                                                                                              |
| :---------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| **FR-NLP-001** | The system shall provide a text input field for users to enter database queries in natural language.                                   |
| **FR-NLP-002**| The system shall parse the natural language input and translate it into an executable SQL query.                                         |
| **FR-NLP-003**| The system shall display the translated SQL query to the user before execution.                                                          |
| **FR-NLP-004**| Upon user confirmation, the system shall execute the generated SQL query and display results in a tabular format.                        |
| **FR-NLP-005**| The system shall translate natural language prompts for schema modifications (e.g., "add a table", "delete a column").                   |
| **FR-NLP-006**| Before executing a schema modification, the system shall check for dependency issues (e.g., foreign keys).                               |
| **FR-NLP-007**| If a dependency conflict is found, the system shall reject the operation and display an error message explaining the conflict.           |

> **Source (Elicitation):** Interviews with non-technical users and secondary research confirmed a strong need for querying databases using plain English to overcome the barrier of learning SQL.

---

## 4. Graphical User Interface (GUI) for Operations (FR-GUI)

| ID          | Requirement                                                                                               |
| :---------- | :-------------------------------------------------------------------------------------------------------- |
| **FR-GUI-001** | The system shall provide a form-based interface for inserting new data into a table.                      |
| **FR-GUI-002** | The system shall provide an interactive interface for updating existing data within a table.            |
| **FR-GUI-003** | The system shall provide clear buttons or icons for performing delete operations on table rows.           |
| **FR-GUI-004** | The system shall display a confirmation prompt to the user before executing any destructive operation (e.g., Delete). |
| **FR-GUI-005** | The system shall display feedback messages (e.g., "Success: Row updated" or "Error: Invalid input") to the user in real-time after an operation. |

> **Source (Elicitation):** User surveys indicated a demand for a visual interface that allows database manipulation without writing any code.


# Non-Functional Requirements for DBuddy

These define quality standards and constraints:

## Usability

-   **UI/UX**: The system shall have a simple, clean, and intuitive user
    interface, inspired by platforms like Notion.
-   **Responsiveness**: The application's layout must be responsive,
    adapting seamlessly to various screen sizes (desktops, tablets, and
    mobile phones).
-   **Transparency**: To build user trust and facilitate learning, the
    system shall show the generated SQL queries.
-   **Error Handling**: All error messages must be displayed in clear,
    simple language, avoiding technical terms.

## Performance

-   **Concurrency**: Handle multiple users/projects concurrently.

## Reliability & Availability

-   **Connection Stability**: The system must ensure stable and
    persistent connections to the user's database.

## Security

-   **Authentication & Encryption**: Use secure authentication and
    encrypted connections.

## Scalability

-   **Growth Support**: The system must support growing datasets, an
    increasing number of projects, and increasing user load.
-   **Extensibility**: Modular backend to allow adding future features
    easily.

## Maintainability

-   **Architecture**: The code shall follow a modular architecture with
    a clear separation between the frontend and backend.
-   **Documentation**: The code must be well-documented for easy
    maintenance, updates, and expansion.
-   **Development Process**: Must support agile incremental
    improvements.
