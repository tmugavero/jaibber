# Wave 5 Feature Testing Guide

Manual testing checklist for the three Wave 5 features. Each test describes what to do and what you should see.

---

## Prerequisites

- Jaibber desktop app running (`npm run tauri dev`)
- Claude Code CLI installed and authenticated (`claude --version`)
- A Jaibber account with at least one project
- At least one agent registered on the project (Settings > Projects > Register agent)

---

## 1. Session Resume

Session resume lets agents remember what they did in previous messages — file edits, commands, reasoning.

### Test 1.1: Basic session persistence

1. Open the desktop app and select a project with a registered Claude agent
2. Send: `@YourAgent create a file called test-session.txt with the text "hello from session 1"`
3. Wait for the agent to complete
4. Send: `@YourAgent what file did you just create?`
5. **Expected:** The agent should remember it created `test-session.txt` without needing to re-read the filesystem. If session resume is working, Claude has the full tool use history from the previous message.

### Test 1.2: Session ID capture

1. After the agent responds to any message, check the browser dev console (or Tauri dev tools)
2. Look for an `agent-session` event log or check the projectStore
3. **Expected:** `currentSessionId` should be populated on the LocalProject entry for that project/agent

### Test 1.3: Session cleared on conversation clear

1. Click the trash icon in the chat header to clear the conversation
2. Confirm the dialog
3. Send a new message to the agent: `@YourAgent what was the last thing you did?`
4. **Expected:** The agent should NOT remember anything from before the clear. It starts a fresh session.

### Test 1.4: Session survives app restart

1. Send a message to the agent and let it respond
2. Close and reopen the Jaibber desktop app
3. Send a follow-up referencing the previous conversation
4. **Expected:** The stored session ID should persist (check projectStore), and if the Claude CLI session file is still valid, the agent resumes context

---

## 2. Task Chaining

Task chaining lets agents create follow-up tasks for other agents when they finish their work.

### Test 2.1: Manual HANDOFF directive

1. Register two agents on the same project (e.g., "Coder" and "Tester")
2. Create a task assigned to "Coder" with the title: "Write a hello world function"
3. In the Coder agent's instructions, add this line:
   ```
   When you complete a task, always end your response with: [HANDOFF: @Tester "Review and test the changes"]
   ```
4. Wait for Coder to complete the task
5. **Expected:**
   - Coder's task status changes to "completed"
   - A new task appears in the Tasks tab assigned to "Tester" with title "Review and test the changes"
   - The new task has a "Chained from" label in the task detail panel
   - If Tester is online, it should auto-pick-up the new task

### Test 2.2: Task lineage display

1. After test 2.1, click on the original Coder task in the Tasks tab
2. **Expected:** The detail panel shows "Follow-up tasks:" with the Tester task listed
3. Click on the Tester task
4. **Expected:** The detail panel shows "Chained from: Write a hello world function"

### Test 2.3: Chain depth limit

1. Set up 3+ agents with instructions that each include a HANDOFF to the next agent
2. Create a task for the first agent
3. **Expected:** The chain stops after 5 levels. Check the browser console for: `[useAbly] Task chain depth limit (5) reached, skipping HANDOFF`

### Test 2.4: Server validation

1. Using the REST API or curl, try to create a task with a `parentTaskId` that doesn't exist:
   ```bash
   curl -X POST https://api.jaibber.com/api/projects/{projectId}/tasks \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{"title": "test", "parentTaskId": "00000000-0000-0000-0000-000000000000"}'
   ```
2. **Expected:** 400 error: "parentTaskId references a non-existent task"

### Test 2.5: SDK createFollowUpTask

1. Create a headless SDK agent with a custom task handler:
   ```typescript
   agent.onTask(async (task, ctx) => {
     await ctx.sendMessage("Working on it...");
     // Do work...
     await ctx.createFollowUpTask({
       title: "Review the output",
       assignedAgentName: "Reviewer",
     });
     await ctx.complete("Done! Handed off to Reviewer.");
   });
   ```
2. Assign a task to this agent
3. **Expected:** After completion, a new task appears for "Reviewer" with parentTaskId set

### Test 2.6: Webhook event

1. Set up a webhook subscribed to `task.chained` events (use a tool like webhook.site)
2. Trigger a task chain (any of the above tests)
3. **Expected:** Your webhook endpoint receives a payload with `event: "task.chained"` containing the new task and `parentTaskId`

---

## 3. Agent Templates

Templates provide one-click agent setup with preset names and system prompts.

### Test 3.1: Template selector in project registration

1. Open Settings > Projects
2. Click "+ Register agent on this machine" on any project
3. **Expected:** A row of template buttons appears above the agent name field (Code Writer, PR Reviewer, Test Writer, DevOps, Bug Hunter, Architect)

### Test 3.2: Template applies name and instructions

1. Click the "PR Reviewer" template button
2. **Expected:**
   - Agent name field is filled with "Reviewer"
   - Agent instructions textarea is filled with the PR Reviewer system prompt (starts with "You are a thorough code reviewer...")
3. You can still edit both fields after applying the template

### Test 3.3: Template selector in project creation

1. Click "+ Create new project"
2. Fill in a project name
3. **Expected:** Template buttons appear in the agent configuration section (desktop only)
4. Click "Bug Hunter"
5. **Expected:** Agent name = "BugHunter", instructions filled with debugging-focused prompt

### Test 3.4: SDK CLI --list-templates

1. Run:
   ```bash
   npx @jaibber/sdk --list-templates
   ```
2. **Expected:** Prints all 6 templates with IDs, names, and descriptions

### Test 3.5: SDK CLI --template flag

1. Run:
   ```bash
   npx @jaibber/sdk \
     --username my-bot --password s3cret \
     --template code-writer \
     --claude-cli --project-dir /path/to/project
   ```
2. **Expected:** Agent starts with name "Coder" and the Code Writer system prompt, without needing `--agent-name` or `--instructions`

### Test 3.6: Template + explicit override

1. Run:
   ```bash
   npx @jaibber/sdk \
     --username my-bot --password s3cret \
     --template code-writer \
     --agent-name "CustomName" \
     --claude-cli
   ```
2. **Expected:** Agent name is "CustomName" (explicit flag overrides template default), but instructions come from the template

---

## Regression Checks

After testing Wave 5 features, verify these existing features still work:

- [ ] Send a message without @mention — all agents respond
- [ ] Send a message with @mention — only the targeted agent responds
- [ ] Agent-to-agent messaging still works (agent @mentions another agent)
- [ ] Task creation from chat message (click "create task" on a message bubble)
- [ ] File upload and inline preview in chat
- [ ] Provider switching (if you have Codex/Gemini configured)
- [ ] Web client shows online agents in the info panel
- [ ] Clear conversation clears chat history (and now also clears session ID)
