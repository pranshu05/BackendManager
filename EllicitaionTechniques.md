## 2. Identification of Elicitation Techniques for Each of the Stakeholders (with Justification)

To ensure that requirements were captured nicely, we applied a **multi-technique elicitation approach**. Each technique was targeted toward specific stakeholder groups and justified based on the nature of information required.

### 2.1 Non-Technical Users

**Techniques Applied:**  
**Interviews and Online Surveys**

**Justification:**  
We designed and circulated a structured Google Form survey targeting non-technical stakeholders such as _analysts, marketers, and students_. [**Dbuddy (Responses)**](https://docs.google.com/spreadsheets/d/15JCPJNc5GeOoPcmQ81w43NOQnzw3iqjqYQgYIPhSGHs/edit?gid=1240202950#gid=1240202950) .This method was selected because surveys allow reaching a wider audience efficiently while capturing both quantitative feedback (usage frequency, feature importance ratings) and qualitative insights (pain points, suggestions).

The responses revealed clear priorities:

- Non-technical users wanted the ability to query in plain English without writing SQL.
- They emphasized simple report generation and GUI-based data filtering/updating to avoid dependency on technical staff.
- They also highlighted the need for support of common file formats (CSV, Excel, JSON) for import/export.

### 2.2 Technical Users

**Techniques Applied:**  
**Interviews and Surveys (same instrument as above, segmented by role)**  
**Group Brainstorming within our group**

**Justification:**  
Technical stakeholders included _developers, database administrators, and QA testing engineers_. From the survey responses we found that following features were required by these group of end users:

- Schema visualization for clarity in database structure.
- Automated data seeding and query generation to save time.
- Efficiency in handling repetitive queries.

Beyond the survey, team brainstorming sessions were conducted to consolidate insights and refine project scope and think about must-have features for our tool. Brainstorming enabled balancing ambitious ideas (as example advanced NLP integration) with practical implementation within available resources. It also surfaced innovative expectations such as transparency in operations showing SQL queries generated behind the scenes to users and error prevention features in form of user feedback to generated queries.

### 2.3 Secondary Research (analysing docs of existing Systems)

**Techniques Applied:**  
**Review of Documentation and Demonstrations**

**Justification:**  
We analyzed existing database tools like AskYourDatabase, AI2SQL, Knack, Stackby, and NocoDB along with research papers on natural language query interfaces and user reviews from platforms like Capterra. This showed that non-technical users such as small business owners and students struggle with writing SQL queries, while technical users like data analysts and software engineers seek efficiency and customization under time constraints. These insights guided us in refining the functional and non-functional requirements for DBuddy because they were real-world applications that helped us understand usage patterns of such tools like dbuddy.

### 2.4 Expert Consultation (domain insight from people who work in industry)

**Techniques Applied:**  
**Interview (Informal discussion with professional alumni via LinkedIn)**

**Justification:**  
To gain industrial insights, we interviewed a professional through LinkedIn. He is a data analyst and is familiar working with databases. The conversation with him provided real-world validation of challenges faced in database usage and opportunities for improvement.

**Key points from the discussion included:**

- **Frequency of Data Pulling:** Interview revealed that this depends on the use case, _OLTP systems_ require fewer pulls (mainly updates), while _OLAP systems_ involve frequent and heavy data pulls.
- **Challenges in Data Access:** If the user already knows SQL, access is manageable, however non-SQL users face significant barriers.
- **Frustrations:** Creating databases with multiple columns and later having to change data types (schema) was highlighted as a pain point.
- **Preferred Output Format:** Tables were considered sufficient since visualization tools like Power BI already cover charts.
- **Query Suggestions:** An auto-suggestion feature for incomplete queries was seen as useful, provided it is accurate enough to avoid user frustration with workload.
- **Future Opportunities:** The interviewee suggested exploring _LLMs_. They also shared their experience of building a project for _PDF_ querying using _LLMs_, which reinforced the feasibility of extending DBuddy beyond SQL to other structured data formats and helped us think out of box.

This interview expanded our perspective by showing how DBuddy could serve both basic academic use cases and advanced applications for industry.

---

This whole elicitation process helped us refine requirements specific to the four main stakeholder groups. We identified non-technical users (marketers, students) as the primary end-users needing simplified query and database management, while technical teams required robust development and testing support. For small teams/start-ups, time-saving automation features came out as the main useful feature and database administrators highlighted the importance of scalability, security and performance.
