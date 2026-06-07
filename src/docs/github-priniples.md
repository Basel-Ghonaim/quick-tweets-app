## Principles of working on a project with GIT & GITHUB:

### Issues Creation Criteria

#### 1. Categorized Title

The title must briefly explain the problem and its location, and the tag system is often used in the title itself:

- Example:
  - Format: [Type/Component]: Brief description of the problem
  - Wrong Example: The login button doesn't work
  - Correct Example: [Auth / Frontend]: Login button crashes on Safari iOS

#### 2. Context & Description

The body of the issue contains a fixed template (Template) that changes according to the type of issue:

- In case of Bugs (Bug):
  - Current Behavior: What is happening now in detail?
  - Expected Behavior: What should happen originally?
  - Steps to Reproduce: Numbered steps (1, 2, 3) so that any developer can see the bug themselves.

- In case of Features (Feature):
  - User Story: Like: "As a user, I want to log in via Google to save time".
  - Use Case: When and how will the client use it?

#### 3. Acceptance Criteria

- This is a very important section and it is a list of specific points that determine when the ticket is considered successfully completed.
- The acceptance criteria should be specific, measurable, achievable, relevant, and time-bound.
- Written in a clear and unambiguous way (often in Checkbox format).
- Example:
  - [ ] The system must support two-factor authentication (2FA).
  - [ ] The API response time should not exceed 200ms.
  - [ ] The new code must be covered by unit tests with at least 80% coverage.

#### 4. Metadata & Labels

- These data help to prioritize and schedule the work (Agile/Scrum):
  - Priority: (Low, Medium, High, Critical Blocker).
  - Labels: To classify the ticket for easy searching (such as: frontend, backend, security, good first issue).
  - Story Points: Estimate the effort and time required to solve the ticket.

#### 5. Technical Environment & Attachments (optional at the moment)

- Providing the technical data that helps the developer isolate the problem and solve it quickly:
  - Environment: Specify the operating system, browser type, application version, or working environment (Staging / Production).
  - Attachments: Screenshots of error screens, video recording of the movement (GIF/Video), or program error logs (Logs / Stack Trace).

### Branch naming convention

#### 1. Use standard prefixes

Branch name must start with a word that identifies the type of work, followed by a slash (/).

- Examples:
  - feature/: to add a new feature to the project (example: new user interface).
  - fix/: to fix a bug or problem in the development or testing environment (Testing).
  - hotfix/: to fix a critical and urgent bug in the live production environment (Production).
  - docs/: to modify or add documentation files only.
  - refactor/: to reorganize and improve the current code without changing its functionality.
  - chore/: for side tasks and updating libraries or project settings.

#### 2. Include the ticket number

Include the ticket number (Issue / Ticket ID) in the branch name.

#### 3. Use hyphens to separate words (Kebab-case)

Use hyphens to separate words in the branch name.

- Examples: feature/122-add-new-user-interface

#### 4. Brevity and Clarity (Short & Descriptive)

The branch name must give a quick idea of the content, but without excessive length (preferably not exceeding 3 to 5 words after the ticket number).

#### 5. Example

- feature/issue-15-add-dark-mode-toggle
- fix/issue-15-fix-dark-mode-toggle


### Commits Creation Criteria (Conventional Commits)

#### 1. Unified structure: <type>(<optional scope>): <description>

- Type: explains the nature of the modification, example:
  - feat: Add a new feature
  - fix: Bug Fix
  - refactor: Improve code without adding new features or fixing bugs.
  - docs: Update documentation or README files.
  - style: Styling modifications that do not affect logic (spaces, breaks).
  - chore: Maintenance tasks that do not affect source code or tests
- Scope: Explains the area of the modification, for example: client, server, shared, or by feature name if it is a feature
- Description: Explains the modification in a concise and clear manner

#### 2. Linguistic and technical rules:

- Use the imperative form: start the description with an imperative verb, for example:
  - fix: fix the bug
  - feat: add a new feature
  - refactor: refactor the code
- Don't use the capital letter: start the description with a lowercase letter (unless it is a proper noun).
- Description must be in English
- Avoid the period at the end: don't put a period (.) at the end of the description

#### 3. Length Limits:

- The first line of the description should not exceed 50 characters
- If there is a need for additional details, leave a blank line, and write the "message body" (Body) so that the length of the line does not exceed 72 characters.

#### 4. Advanced Documentation (Body & Footer)

- **Breaking Changes:** Use `BREAKING CHANGE:` to indicate backward-incompatible changes.
- **Clarity is Key:** Provide clear and concise explanations for complex changes.
- **Explain the WHY (not the HOW):** Explain the reason for the change (Why) not the details of how it was done (How).

#### 5. Commit Life Cycles (Git History)

- Make one commit for each logical and independent unit of work. Do not mix different features in one commit.
- Test before modification: Test your code before making any changes.

### Pull Requests Creation Criteria

#### 1. Preparation Standards:

- **Small PRs:** Avoid creating huge pull requests. Large PRs are harder to review and merge.
- **Single Logical Unit:** Each PR should ideally represent a single, self-contained change. Don't mix unrelated changes (e.g., a new feature and a bug fix) in the same PR.
- **Standardized Title:** The title should follow the same pattern as Commits.

#### 2. PR Content Standards (Description & Template)

- **Summary:** Very brief explanation (What does this code do? Why did you make this change?).
- **Ticket Linking:** Use keywords to automatically close the ticket (e.g., Closes #123 or Fixes PROJ-123).
- **Type of Change:** Specify if it is a Breaking Change, Feature, or Bug Fix.
- **Visual Proof:** (Optional at the moment) If the modification concerns the interfaces (Frontend), screenshots or a short video (GIF) must be attached comparing the appearance before and after the modification.

#### 3. Self-Checklist

- The code works locally without any errors or warnings.
- Unit/Integration Tests cover the new code
- The code follows the working standards and principles defined in the project.
- No extra files have been uploaded by mistake (such as local settings files .env or temporary folders)
