# DBuddy Epics and User Stories

## Epic 1: Getting started with DBuddy
**Focus:** Allowing users to securely register, log in, and access their database projects.  
**To be Delivered in Sprint 1**

**User Stories:**
- **User Story 1:** User registration & login
- **User Story 10:** Create new empty database (project start)

---

## Epic 2: No-Code Database
**Focus:** Enabling non-technical users to create and manage databases without SQL.  
**To be Delivered in Sprint 2–3**

**User Stories:**
- **User Story 5:** Create new tables (form/NLP-based)
- **User Story 6:** Update existing tables (Insert, Update, Delete with buttons/NLP)
- **User Story 2:** Generate realistic mock data
- **User Story 7:** Filter data in a table view

---

## Epic 3: Data Exploration and Querying
**Focus:** Allowing users to query the database in natural language, and provide clear feedback.  
**To be Delivered in Sprint 4**

**User Stories:**
- **User Story 4:** Query database in plain English
- **User Story 8:** Clear error messages in plain English

---

## Epic 4: Database Insights & Optimization
**Focus:** Provide administrators with tools to analyze, optimize, and audit databases.  
**To be Delivered in Sprint 5**

**User Stories:**
- **User Story 12:** Performance improvement suggestions
- **User Story 13:** Monitor PostgreSQL performance metrics
- **User Story 9:** Searching a project
- **User Story 16:** Past queries look-up

---

## Epic 5: User Interface & Experience Enhancements
**Focus:** Ensuring DBuddy is responsive, visually clear, and user-friendly across devices.  
**To be Delivered in Sprint 3 and 6**

**User Stories:**
- **User Story 15:** Mobile-responsive interface
- **User Story 3:** Visualize PostgreSQL schema
- **User Story 14:** Export/download results

# Conflicts within Epics

## Contradictions in Goals  
- **Non-technical users (Epic 2)** want ease of use – quickly creating databases/tables without worrying about schema quality.  
- **Database Administrators (Epic 4)** want well-structured, optimized databases, which may conflict with the “quick and easy” approach of non-technical users.  

### Resolution Strategy  
- **Incremental Delivery**:  
  - First, deliver a basic table creation flow (**Epic 2**) so non-technical users get value quickly.  
  - Then, iteratively add optimization checks/suggestions (**Epic 4**) based on DBA input.  

- **Feedback Loops**:  
  - Run usability testing sessions with non-technical users to evaluate if optimization prompts are overwhelming.  
  - Adjust language and guidance based on feedback.  

---

## Mock Data Generation vs. Query Accuracy  
- **Epic 2: No-Code Database** – *Story 2*: Generate mock data for tables.  
- **Epic 3: Data Exploration & Querying** – *Story 4*: Run queries in plain English.  
