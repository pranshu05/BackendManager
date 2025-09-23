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


</br>

# Non-Functional Requirements for DBuddy

This document defines the quality attributes and constraints for the DBuddy application.

---

## Usability (NFR-US)

| ID           | Requirement                                                                              |
| :----------- | :--------------------------------------------------------------------------------------- |
| *NFR-US-001* | The system shall provide a clean, simple, and intuitive user interface.                  |
| *NFR-US-002* | The system's layout must be responsive, adapting to desktop, tablet, and mobile screens. |
| *NFR-US-003* | The system must present all error messages in clear, non-technical language. |

> *Elicitation Source:* Non-technical users (survey) and Group Brainstorming.

---

## Performance (NFR-PE)

| ID           | Requirement                                                               |
| :----------- | :------------------------------------------------------------------------ |
| *NFR-PE-001* | The system shall be capable of managing and querying multiple user projects concurrently. |

> *Elicitation Source:* Non-technical users (survey): One of the responses featured a need to have a database that could easily manage a number of personal projects concurrently.

---

## Reliability & Availability (NFR-RA)

| ID           | Requirement                                                                          |
| :----------- | :----------------------------------------------------------------------------------- |
| *NFR-RA-001* | The system must maintain stable and persistent database connections during user sessions. |

> *Elicitation Source:* Expert consultation through an Interview. How was it identified: Interview pointed out reliability challenges in frequent queries (OLAP systems).

---

## Security (NFR-SE)

| ID           | Requirement                                                                            |
| :----------- | :------------------------------------------------------------------------------------- |
| *NFR-SE-001* | The system must implement secure authentication and session management to protect user data. |

> *Elicitation Source:* Non-technical users through the survey revealed a need for access based control that requires authentication. How was it identified: By circulating a survey form across stakeholders.

---

## Scalability (NFR-SC)

| ID           | Requirement                                                                                      |
| :----------- | :----------------------------------------------------------------------------------------------- |
| *NFR-SC-001* | The architecture must support a growing number of users, projects, and data volume.              |
| *NFR-SC-002* | The backend should be modular to facilitate the addition of new features with minimal refactoring. |

> *Elicitation Source:* Group brainstorming. How was it identified: Raised during team brainstorming .

---

## Maintainability (NFR-MA)

| ID           | Requirement                                                                                |
| :----------- | :----------------------------------------------------------------------------------------- |
| *NFR-MA-001* | The system should be built on a modular architecture with a clear separation of concerns. |
| *NFR-MA-002* | The codebase should be well-documented to support future development and maintenance.        |
| *NFR-MA-003* | The development process should follow agile principles to support incremental improvements.    |

> *Elicitation Source:* Group brainstorming. How was it identified: Raised during team brainstorming as a dev necessity.
