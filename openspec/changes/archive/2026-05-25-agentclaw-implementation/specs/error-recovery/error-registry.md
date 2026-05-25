# AgentClaw Error Registry — 12 Features Technical Specification

> Version: 1.0 | Date: 2026-05-22
> Covers: F1-F12 error states, recovery paths, retry logic

---

## Overview

### Error Code Format

```
{FEATURE}.{ERROR_TYPE}
```

- Feature prefix: `GUI`, `RESEARCH`, `FRAMEWORK`, `TIMELINE`, `KNOWLEDGE`, `DOMAIN`, `SKILL`, `IMPORT`, `MODEL`, `GRAPH`, `VERSION`, `PLATFORM`
- Error type: UPPERCASE_SNAKE_CASE

### Severity Levels

| Level | Behavior | Example |
|-------|----------|---------|
| `critical` | Blocks user workflow, requires immediate action | Database corruption, all models unavailable |
| `warning` | Degraded experience, user can continue | One model unavailable, import partially failed |
| `info` | Transient issue, auto-resolves | Brief network hiccup, retrying |

### Recovery Strategies

| Strategy | Description |
|----------|-------------|
| `retry` | Automatic retry with exponential backoff |
| `fallback` | Switch to alternative approach/model |
| `graceful-degrade` | Reduce functionality, keep core working |
| `user-action` | Requires explicit user intervention |

---

## F1: GUI Interface (`GUI`)

### GUI.WINDOW_CREATE_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | critical |
| **Message** | "Failed to create application window. Please restart AgentClaw." |
| **Recovery** | user-action |
| **Retry** | None — requires restart |
| **Log Level** | error |

**Trigger**: Electron BrowserWindow creation fails (GPU process crash, display unavailable).

**State**: Blank screen or no window appears. System tray icon may still be visible.

**Recovery Path**:
1. Log full error with Electron version and GPU info
2. Attempt recovery: delete GPU cache, retry once
3. If retry fails: show system notification "AgentClaw encountered an error. Click to restart."
4. User clicks → `app.relaunch()`

---

### GUI.LAYOUT_RENDER_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Layout rendering encountered an error. Attempting to recover..." |
| **Recovery** | retry |
| **Retry** | 1 retry after 1s |
| **Log Level** | warn |

**Trigger**: React ErrorBoundary catches a render error in layout components.

**State**: Error boundary fallback UI displayed in the affected panel.

**Recovery Path**:
1. ErrorBoundary catches error, shows fallback UI with "Reload" button
2. Click "Reload" → remounts the errored component subtree
3. If persists: "Refresh Page" button triggers `location.reload()`

---

### GUI.HOT_RELOAD_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | info |
| **Message** | (not shown to user) |
| **Recovery** | retry |
| **Retry** | Automatic on next file save |
| **Log Level** | debug |

**Trigger**: Next.js HMR websocket disconnects or compilation fails during development.

**State**: Dev-only. No user-facing impact in production.

---

## F2: Scheduled Research (`RESEARCH`)

### RESEARCH.SCHEDULER_INIT_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Research scheduler failed to initialize. Manual research is still available." |
| **Recovery** | graceful-degrade |
| **Retry** | Retry on next app start |
| **Log Level** | error |

**Trigger**: Cron parser fails, or persisted schedule data is corrupted.

**State**: Scheduled research runs do not execute. Manual triggers via "Run Research" button still work.

**Recovery Path**:
1. Log corrupted schedule data
2. Disable scheduler, show status "Scheduler paused" in research dashboard
3. User can manually reconfigure schedules
4. Scheduler retries initialization on next app launch

---

### RESEARCH.RUN_API_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Research run failed (API error). Retrying in {n} minutes..." |
| **Recovery** | retry |
| **Retry** | Exponential backoff: 1min, 2min, 4min, 8min, max 30min. Max 5 retries. |
| **Log Level** | warn |

**Trigger**: API call to LLM provider fails (429, 500, network timeout).

**State**: Research run marked as "failed" with retry count. Dashboard shows "Last run failed, retrying at HH:MM".

**Recovery Path**:
1. Mark current run as `failed` in DB with error details
2. Schedule retry with exponential backoff
3. On max retries exceeded: mark as `permanently_failed`, show in dashboard with "Retry Now" button
4. User clicks "Retry Now" → resets retry counter, executes immediately

---

### RESEARCH.RUN_TIMEOUT

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Research run exceeded time limit ({timeout}s). Partial results saved." |
| **Recovery** | graceful-degrade |
| **Retry** | None |
| **Log Level** | warn |

**Trigger**: Research run exceeds configured timeout (default 300s).

**State**: Partial results (if any) are saved as knowledge nodes. Run marked as `timed_out`.

**Recovery Path**:
1. Cancel the running AgentSession
2. Save any partial output as knowledge node with tag `partial-research`
3. Log duration and token usage
4. Dashboard shows "Timed out" badge with partial results

---

### RESEARCH.RESULT_PARSE_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Research completed but results could not be parsed. Raw output saved." |
| **Recovery** | graceful-degrade |
| **Retry** | None |
| **Log Level** | warn |

**Trigger**: Agent output cannot be parsed into structured knowledge nodes.

**State**: Raw text saved to inbox as "Unprocessed research output". User can manually review.

---

## F3: Framework Analysis (`FRAMEWORK`)

### FRAMEWORK.EXECUTION_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Framework analysis failed. {framework_name} could not complete." |
| **Recovery** | retry |
| **Retry** | 1 retry immediately, then user-initiated |
| **Log Level** | warn |

**Trigger**: LLM API failure during framework analysis execution.

**State**: Analysis shows "Failed" status in framework results list.

**Recovery Path**:
1. Auto-retry once
2. If fails again: show error with "Retry" button
3. User clicks "Retry" → re-executes with same parameters

---

### FRAMEWORK.DECISION_RECORD_WRITE_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Failed to save decision record. Analysis results are preserved." |
| **Recovery** | retry |
| **Retry** | 3 retries with 1s interval |
| **Log Level** | error |

**Trigger**: File system write failure when creating ADR markdown file.

**State**: Analysis results saved in DB. Decision record file not created.

**Recovery Path**:
1. Retry write 3 times
2. If all fail: mark decision record as `write_pending` in DB
3. Next app launch attempts to write pending records

---

## F4: Timeline & Prediction (`TIMELINE`)

### TIMELINE.PREDICTION_GENERATION_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Prediction generation failed for '{topic}'. You can retry manually." |
| **Recovery** | retry |
| **Retry** | User-initiated only |
| **Log Level** | warn |

**Trigger**: LLM API failure during prediction generation.

**State**: Prediction entry shows "Generation failed" status with retry button.

---

### TIMELINE.TREND_ANALYSIS_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | info |
| **Message** | "Trend analysis could not be generated. Timeline data is still available." |
| **Recovery** | graceful-degrade |
| **Retry** | Next scheduled analysis cycle |
| **Log Level** | warn |

**Trigger**: Insufficient data or API failure for trend analysis.

**State**: Timeline view works without trend analysis section. "Trends unavailable" placeholder shown.

---

### TIMELINE.PREDICTION_EXPIRED_MISMATCH

| Field | Value |
|-------|-------|
| **Severity** | info |
| **Message** | (not shown — internal tracking) |
| **Recovery** | none |
| **Retry** | N/A |
| **Log Level** | info |

**Trigger**: Prediction expires but actual outcome data is unavailable to compare.

**State**: Prediction marked as `expired_no_data`. Accuracy stats exclude this prediction.

---

## F5: Knowledge Entry — Expert Chat + Inbox (`KNOWLEDGE`)

### KNOWLEDGE.CHAT_API_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | critical |
| **Message** | "Message delivery failed. Your draft has been saved. Tap to retry." |
| **Recovery** | retry |
| **Retry** | Exponential backoff: 1s, 2s, 4s, max 30s. Max 10 retries. |
| **Log Level** | error |

**Trigger**: API call fails during message generation (500, 429, network error).

**State**: User's message preserved with red retry banner. Chat input remains enabled. Streaming (if started) stops.

**Recovery Path**:
1. Preserve user message as draft in conversation state
2. Show red banner: "Generation failed. Tap to retry." on the failed message
3. Auto-retry with exponential backoff in background
4. User can click "Retry" for immediate retry
5. After 10 failures: suggest switching model in toast

---

### KNOWLEDGE.CHAT_STREAM_INTERRUPTED

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Response was interrupted. Partial response saved." |
| **Recovery** | retry |
| **Retry** | User-initiated "Continue" or "Retry" |
| **Log Level** | warn |

**Trigger**: Streaming response disconnects or times out mid-generation.

**State**: Partial response visible in chat. "Continue" button appended to partial message.

**Recovery Path**:
1. Save partial response to DB
2. Show "Continue" button at end of partial message
3. "Continue" sends continuation request with partial content as context
4. "Retry" discards partial and re-sends original message

---

### KNOWLEDGE.CHAT_MODEL_SWITCH_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Failed to switch to {model_name}. Continuing with {current_model}." |
| **Recovery** | fallback |
| **Retry** | None — stays on current model |
| **Log Level** | warn |

**Trigger**: Selected model is unavailable or API key invalid.

**State**: Model switcher reverts to previous model. Toast notification shown.

---

### KNOWLEDGE.INBOX_PROCESS_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Failed to process inbox item. Original content preserved." |
| **Recovery** | retry |
| **Retry** | User-initiated "Retry" button on inbox item |
| **Log Level** | warn |

**Trigger**: AI summary generation fails for inbox item.

**State**: Inbox item shows raw content without AI summary. "Generate Summary" button available.

---

### KNOWLEDGE.INBOX_CONFIRM_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Failed to save to domain. Your item is still in the inbox." |
| **Recovery** | retry |
| **Retry** | 3 retries with exponential backoff |
| **Log Level** | error |

**Trigger**: Database write failure when confirming inbox item into a domain.

**State**: Inbox item stays in inbox. Error toast shown.

---

## F6: Domain Management (`DOMAIN`)

### DOMAIN.CREATE_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | critical |
| **Message** | "Failed to create domain. Please try again." |
| **Recovery** | retry |
| **Retry** | User-initiated retry |
| **Log Level** | error |

**Trigger**: File system error creating domain directory, or DB write failure.

**State**: Dialog stays open with form data preserved. Error message below form.

**Recovery Path**:
1. Log exact failure (FS or DB)
2. Keep dialog open with user input
3. Show error inline: "Could not create directory: {reason}"
4. User corrects and retries

---

### DOMAIN.CONFIG_PARSE_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Domain configuration is corrupted. Using defaults." |
| **Recovery** | graceful-degrade |
| **Retry** | None — uses defaults |
| **Log Level** | warn |

**Trigger**: config.yaml parsing fails (malformed YAML, missing required fields).

**State**: Domain loads with default configuration. Settings page shows "Configuration reset to defaults" notice.

**Recovery Path**:
1. Log malformed config content
2. Load domain with default config
3. Show warning badge in domain list: "Config reset"
4. User can re-edit config from settings page

---

### DOMAIN.DELETE_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Failed to delete domain. Some files may still exist." |
| **Recovery** | retry |
| **Retry** | User-initiated retry |
| **Log Level** | error |

**Trigger**: Partial deletion — DB records deleted but file cleanup failed, or vice versa.

**State**: Domain may appear in inconsistent state. "Retry Delete" or "Force Delete" options shown.

---

## F7: Skill System (`SKILL`)

### SKILL.PARSE_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Skill '{name}' has invalid format and was not loaded." |
| **Recovery** | graceful-degrade |
| **Retry** | On next skill reload |
| **Log Level** | warn |

**Trigger**: SKILL.md file parsing fails (missing required sections, invalid YAML).

**State**: Skill not registered. Skills list shows "Invalid" badge. Other skills unaffected.

---

### SKILL.EXECUTION_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Skill '{name}' failed to execute. {error_summary}" |
| **Recovery** | retry |
| **Retry** | User-initiated retry |
| **Log Level** | warn |

**Trigger**: Skill execution encounters error (API failure, timeout, invalid output).

**State**: Skill execution panel shows error with "Retry" button. Skill stats track failure.

---

### SKILL.EXECUTION_TIMEOUT

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Skill '{name}' timed out after {timeout}s." |
| **Recovery** | retry |
| **Retry** | User-initiated retry |
| **Log Level** | warn |

**Trigger**: Skill execution exceeds timeout limit (default 60s, configurable per skill).

**State**: Skill cancelled. Results discarded. "Retry" button shown.

---

## F8: External Import (`IMPORT`)

### IMPORT.URL_FETCH_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Failed to fetch URL: {url}. {reason}" |
| **Recovery** | retry |
| **Retry** | 3 retries with exponential backoff (1s, 2s, 4s) |
| **Log Level** | warn |

**Trigger**: HTTP request fails (404, timeout, CORS-like blocking, DNS failure).

**State**: Import dialog shows error with "Retry" button. No inbox item created.

**Recovery Path**:
1. Auto-retry 3 times
2. If all fail: show error with "Retry" button
3. User can edit URL and retry

---

### IMPORT.PDF_PARSE_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Failed to extract text from PDF. The file may be image-based or corrupted." |
| **Recovery** | user-action |
| **Retry** | None |
| **Log Level** | warn |

**Trigger**: PDF text extraction returns empty or errors out.

**State**: Import dialog shows error. Suggests "This PDF may be image-based. Try OCR processing."

---

### IMPORT.PDF_TOO_LARGE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "PDF exceeds maximum size ({max}MB). Please split the file and import parts separately." |
| **Recovery** | user-action |
| **Retry** | None |
| **Log Level** | info |

**Trigger**: PDF file size exceeds configured limit (default 50MB).

**State**: Import rejected before processing starts. Clear size limit shown.

---

### IMPORT.RSS_PARSE_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | info |
| **Message** | "RSS feed '{name}' could not be parsed. Will retry on next poll." |
| **Recovery** | retry |
| **Retry** | Next scheduled poll (default 1 hour) |
| **Log Level** | warn |

**Trigger**: RSS feed URL returns invalid XML or is unreachable.

**State**: Feed marked as `error` in sources list. Next poll cycle retries automatically.

---

### IMPORT.PARTIAL_SUCCESS

| Field | Value |
|-------|-------|
| **Severity** | info |
| **Message** | "Imported {success} of {total} items. {failed} items failed." |
| **Recovery** | retry |
| **Retry** | "Retry Failed" button retries only failed items |
| **Log Level** | info |

**Trigger**: Batch import where some items succeed and some fail.

**State**: Successfully imported items proceed to inbox. Failed items listed with individual retry buttons.

---

## F9: Model Management (`MODEL`)

### MODEL.API_KEY_INVALID

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "API key for {provider} is invalid or expired. Please update it." |
| **Recovery** | user-action |
| **Retry** | None — requires new key |
| **Log Level** | warn |

**Trigger**: API key validation fails during import or first use.

**State**: Key marked as `invalid` in settings. Red indicator shown next to provider.

**Recovery Path**:
1. Show inline error in API key dialog: "Validation failed: {reason}"
2. Keep dialog open for user to re-enter key
3. If key was previously valid: show "Key expired" notification

---

### MODEL.API_KEY_ENCRYPTION_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | critical |
| **Message** | "Failed to securely store API key. Key will not be persisted." |
| **Recovery** | user-action |
| **Retry** | None — OS keystore issue |
| **Log Level** | error |

**Trigger**: Electron safeStorage encryption fails (credential service unavailable).

**State**: Key cannot be stored. User warned that key will only last for current session.

**Recovery Path**:
1. Log safeStorage availability status
2. Offer in-memory-only storage as fallback: "Key will only work during this session"
3. Suggest checking OS credential manager setup

---

### MODEL.ALL_MODELS_UNAVAILABLE

| Field | Value |
|-------|-------|
| **Severity** | critical |
| **Message** | "No AI models are currently available. Check your API keys or set up a local model." |
| **Recovery** | user-action |
| **Retry** | Periodic health check every 30s |
| **Log Level** | error |

**Trigger**: All configured providers return errors or no API keys configured.

**State**: Chat input disabled. Model switcher shows red "No models" indicator. Status bar shows "Offline".

**Recovery Path**:
1. Disable chat input with explanatory message
2. Show "Set up API Key" action button pointing to settings
3. Background health check every 30s
4. When any model becomes available: re-enable chat, show toast "Model available: {name}"

---

### MODEL.SWITCH_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Failed to switch to {model}. Staying on {current_model}." |
| **Recovery** | fallback |
| **Retry** | None — stays on current model |
| **Log Level** | warn |

**Trigger**: Selected model fails health check at switch time.

**State**: Model reverts to previous. Toast notification shown.

---

## F10: Knowledge Graph Visualization (`GRAPH`)

### GRAPH.RENDER_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Graph rendering failed. Switched to list view." |
| **Recovery** | graceful-degrade |
| **Retry** | "Retry Graph" button available |
| **Log Level** | warn |

**Trigger**: D3.js/WebGL rendering error (GPU crash, Canvas unavailable, memory).

**State**: View switches to list view automatically. Error banner offers "Retry Graph" and "Report Issue".

**Recovery Path**:
1. Catch render error
2. Unmount graph component gracefully
3. Switch to list view (full replacement, not degraded)
4. Show banner: "Graph rendering failed. [Retry Graph] [Report Issue]"
5. "Retry Graph" attempts remount with fresh D3 instance

---

### GRAPH.LAYOUT_COMPUTATION_TIMEOUT

| Field | Value |
|-------|-------|
| **Severity** | info |
| **Message** | "Graph layout is taking longer than expected. Showing partial layout..." |
| **Recovery** | graceful-degrade |
| **Retry** | Background computation continues |
| **Log Level** | info |

**Trigger**: Force-directed layout exceeds 5s computation time.

**State**: Partial layout shown (nodes positioned roughly). Layout continues computing in Worker.

**Recovery Path**:
1. After 5s: show current partial layout
2. Continue computation in Worker thread
3. When complete: animate nodes to final positions
4. If exceeds 30s: stop computation, show "Layout incomplete" notice

---

### GRAPH.TOO_MANY_NODES

| Field | Value |
|-------|-------|
| **Severity** | info |
| **Message** | (not shown — automatic degradation) |
| **Recovery** | graceful-degrade |
| **Retry** | N/A |
| **Log Level** | info |

**Trigger**: Node count exceeds SVG threshold (> 1000).

**State**: Automatically switches to WebGL renderer. User sees no interruption.

---

## F11: Safe Version Control (`VERSION`)

### VERSION.GIT_INIT_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | critical |
| **Message** | "Version control initialization failed. Changes will not be tracked." |
| **Recovery** | retry |
| **Retry** | Retry on next app start |
| **Log Level** | error |

**Trigger**: Git repository initialization fails (permission denied, git not installed).

**State**: Version control disabled. History panel shows "Version control unavailable". Write operations proceed without auto-commit.

**Recovery Path**:
1. Log detailed git error
2. Check if git is installed: `git --version`
3. If git missing: show setup instructions "Install Git to enable version control"
4. If permission issue: show path and suggest fix
5. Retry on next app launch

---

### VERSION.AUTO_COMMIT_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Auto-save checkpoint failed. Your changes are saved but not versioned." |
| **Recovery** | retry |
| **Retry** | 3 retries with 1s interval |
| **Log Level** | error |

**Trigger**: `git add + git commit` fails during pre-write auto-commit.

**State**: Write operation proceeds (content saved to DB/file). Version checkpoint not created.

**Recovery Path**:
1. Retry commit 3 times
2. If all fail: log error, allow write to proceed (content is saved)
3. Queue commit for retry in background
4. Status bar shows warning icon: "Version control: {n} uncommitted changes"

---

### VERSION.ROLLBACK_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | critical |
| **Message** | "Rollback failed. Please check the version history for details." |
| **Recovery** | user-action |
| **Retry** | User-initiated retry |
| **Log Level** | error |

**Trigger**: `git checkout` fails during rollback (merge conflict, dirty working tree).

**State**: Current state unchanged. Error dialog explains issue.

**Recovery Path**:
1. Log git error output
2. Show error dialog with: reason + suggested action
3. If dirty tree: offer "Stash changes and retry" option
4. If merge conflict: show conflict details, offer manual resolution

---

### VERSION.WRITE_OUT_OF_SCOPE

| Field | Value |
|-------|-------|
| **Severity** | warning |
| **Message** | "Agent attempted to write outside domain directory. Write blocked." |
| **Recovery** | none |
| **Retry** | N/A — security violation |
| **Log Level** | error |

**Trigger**: Agent's write operation targets a path outside the allowed domain directory.

**State**: Write blocked. Logged as security event. User notified via toast.

---

## F12: Cross-Platform Build (`PLATFORM`)

### PLATFORM.PATH_RESOLVE_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | critical |
| **Message** | "Failed to resolve application data directory." |
| **Recovery** | user-action |
| **Retry** | Retry on next app start |
| **Log Level** | error |

**Trigger**: `app.getPath('userData')` returns unexpected path or is not writable.

**State**: App cannot start. Error dialog shown with path info.

**Recovery Path**:
1. Log resolved path and platform
2. Show dialog: "Data directory '{path}' is not accessible."
3. Offer "Choose Directory" to let user select alternative location
4. Store custom path in `app.getPath('userData')/agentclaw-custom-path`

---

### PLATFORM.AUTO_UPDATE_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | info |
| **Message** | (not shown — silent failure) |
| **Recovery** | retry |
| **Retry** | Next scheduled check (4 hours) |
| **Log Level** | info |

**Trigger**: Update check fails (network error, GitHub Releases unreachable).

**State**: No user notification. Update check retries on next scheduled interval.

---

### PLATFORM.DATABASE_MIGRATION_FAILURE

| Field | Value |
|-------|-------|
| **Severity** | critical |
| **Message** | "Database migration failed. Application cannot start. Backup saved." |
| **Recovery** | user-action |
| **Retry** | None — manual intervention required |
| **Log Level** | error |

**Trigger**: Migration runner fails during app startup (SQL error, schema conflict).

**State**: App shows migration error screen. Does not proceed to main UI.

**Recovery Path**:
1. Create automatic backup: `{db-path}.backup-{timestamp}`
2. Log failed migration version and SQL error
3. Show error screen with: "Migration v{n} failed: {reason}"
4. Offer options: "Restore from backup" / "Reset database" / "Open log file"
5. "Restore from backup" → copy backup over main DB, retry migration

---

## Unknown Error Handling

### SYSTEM.UNKNOWN

| Field | Value |
|-------|-------|
| **Severity** | critical |
| **Message** | "An unexpected error occurred." |
| **Recovery** | user-action |
| **Retry** | None |
| **Log Level** | error |

**Trigger**: Any unhandled error not matching a specific error code.

**State**: Generic error UI shown. Full stack trace logged.

**Behavior**:
1. Log full error with stack trace and context
2. Show generic error message to user
3. Offer "Report Issue" action that opens GitHub issues with pre-filled error info
4. Track occurrence for analytics

---

## Error Registry TypeScript Interface

```typescript
interface ErrorEntry {
  code: string;
  feature: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  recovery: 'retry' | 'fallback' | 'graceful-degrade' | 'user-action' | 'none';
  retryConfig?: {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  };
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  userAction?: string;
}

const ERROR_REGISTRY: Record<string, ErrorEntry> = {
  'GUI.WINDOW_CREATE_FAILURE': { /* ... */ },
  'GUI.LAYOUT_RENDER_FAILURE': { /* ... */ },
  'RESEARCH.SCHEDULER_INIT_FAILURE': { /* ... */ },
  'RESEARCH.RUN_API_FAILURE': { /* ... */ },
  'RESEARCH.RUN_TIMEOUT': { /* ... */ },
  'RESEARCH.RESULT_PARSE_FAILURE': { /* ... */ },
  'FRAMEWORK.EXECUTION_FAILURE': { /* ... */ },
  'FRAMEWORK.DECISION_RECORD_WRITE_FAILURE': { /* ... */ },
  'TIMELINE.PREDICTION_GENERATION_FAILURE': { /* ... */ },
  'TIMELINE.TREND_ANALYSIS_FAILURE': { /* ... */ },
  'TIMELINE.PREDICTION_EXPIRED_MISMATCH': { /* ... */ },
  'KNOWLEDGE.CHAT_API_FAILURE': { /* ... */ },
  'KNOWLEDGE.CHAT_STREAM_INTERRUPTED': { /* ... */ },
  'KNOWLEDGE.CHAT_MODEL_SWITCH_FAILURE': { /* ... */ },
  'KNOWLEDGE.INBOX_PROCESS_FAILURE': { /* ... */ },
  'KNOWLEDGE.INBOX_CONFIRM_FAILURE': { /* ... */ },
  'DOMAIN.CREATE_FAILURE': { /* ... */ },
  'DOMAIN.CONFIG_PARSE_FAILURE': { /* ... */ },
  'DOMAIN.DELETE_FAILURE': { /* ... */ },
  'SKILL.PARSE_FAILURE': { /* ... */ },
  'SKILL.EXECUTION_FAILURE': { /* ... */ },
  'SKILL.EXECUTION_TIMEOUT': { /* ... */ },
  'IMPORT.URL_FETCH_FAILURE': { /* ... */ },
  'IMPORT.PDF_PARSE_FAILURE': { /* ... */ },
  'IMPORT.PDF_TOO_LARGE': { /* ... */ },
  'IMPORT.RSS_PARSE_FAILURE': { /* ... */ },
  'IMPORT.PARTIAL_SUCCESS': { /* ... */ },
  'MODEL.API_KEY_INVALID': { /* ... */ },
  'MODEL.API_KEY_ENCRYPTION_FAILURE': { /* ... */ },
  'MODEL.ALL_MODELS_UNAVAILABLE': { /* ... */ },
  'MODEL.SWITCH_FAILURE': { /* ... */ },
  'GRAPH.RENDER_FAILURE': { /* ... */ },
  'GRAPH.LAYOUT_COMPUTATION_TIMEOUT': { /* ... */ },
  'GRAPH.TOO_MANY_NODES': { /* ... */ },
  'VERSION.GIT_INIT_FAILURE': { /* ... */ },
  'VERSION.AUTO_COMMIT_FAILURE': { /* ... */ },
  'VERSION.ROLLBACK_FAILURE': { /* ... */ },
  'VERSION.WRITE_OUT_OF_SCOPE': { /* ... */ },
  'PLATFORM.PATH_RESOLVE_FAILURE': { /* ... */ },
  'PLATFORM.AUTO_UPDATE_FAILURE': { /* ... */ },
  'PLATFORM.DATABASE_MIGRATION_FAILURE': { /* ... */ },
  'SYSTEM.UNKNOWN': { /* ... */ },
};
```

## Summary Statistics

| Feature | Error Count | Critical | Warning | Info |
|---------|-------------|----------|---------|------|
| F1 GUI | 3 | 1 | 1 | 1 |
| F2 Research | 4 | 0 | 4 | 0 |
| F3 Framework | 2 | 0 | 2 | 0 |
| F4 Timeline | 3 | 0 | 1 | 2 |
| F5 Knowledge | 5 | 1 | 4 | 0 |
| F6 Domain | 3 | 1 | 2 | 0 |
| F7 Skill | 3 | 0 | 3 | 0 |
| F8 Import | 5 | 0 | 3 | 2 |
| F9 Model | 4 | 2 | 2 | 0 |
| F10 Graph | 3 | 0 | 1 | 2 |
| F11 Version | 4 | 2 | 2 | 0 |
| F12 Platform | 3 | 2 | 0 | 1 |
| System | 1 | 1 | 0 | 0 |
| **Total** | **43** | **10** | **25** | **8** |
