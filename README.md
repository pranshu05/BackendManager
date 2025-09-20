<div align="center">
  <img src="https://www.daiict.ac.in/sites/default/files/inline-images/20250107DAUfinalIDcol_SK-01_0.png" alt="University Logo" width="300">
</div>

<div align="center">

# Project: Backend Manager
### Course: IT314-SOFTWARE ENGINEERING
### University: Dhirubhai Ambani University

</div>

---

<div align="center">

## Group-14 Members

| Student ID         | Name             | GitHub |
| :----------------- | :--------------- | :----- |
| 202301143 (Leader) | Pranshu Patel    | <a href="https://github.com/pranshu05"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |
| 202301187          | Nisarg Bhatia    | <a href="https://github.com/nisarg711"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |
| 202301159          | Dipkumar Zadafiya| <a href="https://github.com/202301159"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |
| 202301192          | Harsh Patel      | <a href="https://github.com/Harsh97120"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |
| 202301157          | Parv Khetawat    | <a href="https://github.com/202301157"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |
| 202301139          | Smit Limbasiya   | <a href="https://github.com/202301139"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |
| 202301181          | Prexa Patel      | <a href="https://github.com/202301181-PrexaPatel"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |
| 202301133          | Kathan Parikh    | <a href="https://github.com/KathanParikh"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |
| 202301183          | Raj Makavana     | <a href="https://github.com/202301183"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |
| 202301199          | Vishal Joliya    | <a href="https://github.com/202301199"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |

</div>

---

# DBuddy

## Introduction

DBuddy is a no code platform built for PostgreSQL that makes working with databases simple and intuitive. Instead of writing complex SQL, users can create, manage, query, and visualize their databases through a clean dashboard, natural language commands, and easy-to-use buttons.

## User Stories 

## 1) User Registration

| _Front of the Card_                                                                                       | _Back of the Card_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| As a new user, I want to register and create an account so that I can access Dbuddy and start my project. | _Success Criteria:_ <br> • There is a sign up page which provides multiple options to register.<br> • The user fills all the details during registration.<br> • An account is created and the user is able to log in with the newly created credentials and is taken to the main dashboard.<br><br> _Failure Criteria:_ <br> • The system does not store the details resulting in unsuccessful registration.<br> • The user enters incorrect or incomplete details.<br> • The user is not able to log in after account creation. |

---

## 2) Mock Data Generation

| _Front of the Card_                                                                                                                                         | _Back of the Card_                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| As a non-technical user, I want to generate realistic mock data for a PostgreSQL table schema, so I can simulate database operations without SQL expertise. | _Success Criteria:_ <br> • The user can select a table and specify the number of rows to generate.<br> • The system populates the table with realistic and appropriate data.<br> • The user can immediately see and use the generated data.<br><br> _Failure Criteria:_ <br> • The system fails to generate data or errors occur.<br> • Generated data is random gibberish and not realistic.<br> • The user cannot find or use the feature. |

---

## 3) Schema Visualization

| _Front of the Card_                                                                                   | _Back of the Card_                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| As a non-technical user, I want to visualize my PostgreSQL schema, so I can understand relationships. | _Success Criteria:_ <br> • The user connects their database and sees a visual diagram.<br> • Tables are boxes and relationships are lines.<br> • The diagram is clear and easy to understand.<br><br> _Failure Criteria:_ <br> • The system fails to generate a diagram.<br> • The diagram is messy or inaccurate.<br> • The user cannot understand table relationships. |

---

## 4) Natural Language Queries

| _Front of the Card_                                                                                                                      | _Back of the Card_                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| As a marketer, I want to get the data using simple English so that I can get information for my reports without writing complex queries. | _Success Criteria:_ <br> • The user types a query in the search bar.<br> • The system returns correct and relevant results.<br><br> _Failure Criteria:_ <br> • Database is inaccessible.<br> • System provides incorrect or irrelevant details. |

---

## 5) Table Creation without SQL

| _Front of the Card_                                                                                                                                              | _Back of the Card_                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| As a student, I want to create a new table and use it to store the data without using SQL, so that I can build my project database without writing any SQL code. | _Success Criteria:_ <br> • The student creates a table using natural language.<br> • Columns, names, and simple data types can be specified.<br> • The new table is created and visible in schema view.<br><br> _Failure Criteria:_ <br> • Unable to create table due to errors.<br> • Created table does not match specifications.<br> • Process is more complex than just writing SQL. |

---

## 6) Update Tables

| *Front of the Card* | *Back of the Card* |
|------------------------|-----------------------|
| As a registered user, I want to update existing tables using buttons and natural language, so that I can easily make changes without SQL queries. | *Success Criteria:* <br> • User can insert, update, or delete via buttons or natural language.<br> • System translates instructions into SQL.<br> • Updates are applied successfully.<br><br> *Failure Criteria:* <br> • Buttons don’t trigger updates.<br> • Natural language is ignored.<br> • User does not know if the update succeeded. |

---

## 7) Table Filtering

| *Front of the Card* | *Back of the Card* |
|------------------------|-----------------------|
| As a marketer, I want to filter data in a table view without writing code, so that I can quickly find specific information, like "all users from Mumbai." | *Success Criteria:* <br> • Marketer selects a database and adds filter criteria.<br> • The system filters and shows correct data.<br><br> *Failure Criteria:* <br> • Database inaccessible.<br> • Incorrect or irrelevant results shown. |

---

## 8) Error Messages

| *Front of the Card* | *Back of the Card* |
|------------------------|-----------------------|
| As a non-technical user, I want to get an error message if my query fails so that I can understand what I did wrong and fix it. | *Success Criteria:* <br> • System provides a clear error message in simple English.<br> • Error identifies the likely cause.<br><br> *Failure Criteria:* <br> • No error message is displayed.<br> • Cryptic technical error shown (e.g., ERROR: 42P01).<br> • User cannot fix query and gives up. |

---

## 9) Project Search

| *Front of the Card* | *Back of the Card* |
|------------------------|-----------------------|
| As a Dbuddy user, I want to search for my projects by name or keyword, so that I can quickly locate and open the correct project without scrolling. | *Success Criteria:* <br> • Search bar above project list.<br> • Supports full or partial names.<br> • Results filter in real-time.<br> • “No projects found” shown when no match.<br> • Clicking opens project.<br><br> *Failure Criteria:* <br> • Search bar missing or broken.<br> • Irrelevant or incorrect results.<br> • Search is case-sensitive or too slow. |

---

## 10) Create New Database

| *Front of the Card* | *Back of the Card* |
|------------------------|-----------------------|
| As a start-up team member, I want to create a completely new, empty database directly from DBuddy, so that I can start a new project without using external tools. | *Success Criteria:* <br> • "Create New Database" option exists.<br> • User enters details.<br> • DBuddy connects to new database.<br><br> *Failure Criteria:* <br> • Database not created.<br> • Database not shown in project list. |

---

## 11) Team Collaboration

| Front of the Card | Back of the Card |
|------------------------|-----------------------|
| As a Team Member, I want to collaborate on a database project with real-time updates, so that my team can work together efficiently. | Success Criteria: <br> • User shares project with team.<br> • Team members receive notifications and access.<br> • Changes sync in real-time.<br><br> Failure Criteria: <br> • Unable to share project.<br> • Permission conflicts.<br> • Changes not synced in real-time. |

---

