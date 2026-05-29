# Privacy Review: Prompt Library Tool — F-usage Token-Count Storage

**Date:** 2026-05-29  
**Reviewer:** Jordan (Legal/Privacy Advisor)  
**Scope:** localStorage usage of F-usage token-count metrics, prompt content retention, run response storage  
**Risk Assessment:** ✅ **LOW** (no PII, minimal sensitive data, user-controlled deletion available)

---

## Summary

The Prompt Library Tool stores run metadata and computed token estimates in **browser-local localStorage**. The implementation is privacy-sound:

- **Token estimates** are calculated client-side (prompt length ÷ 4) and never sent to any server
- **Run history** includes the full `sentPrompt` and `response` text, **but is client-only, capped at 10 runs/prompt, and user-deletable**
- **Variable values** are cached locally for UX convenience (auto-fill on reopen) with no external exposure
- **API key** is stored in localStorage and only transmitted to Anthropic during a run

No personally identifiable information (PII), location data, or health/disability markers are stored. The content retention model (10 runs, 32 KB per response) is user-aware and defensible.

---

## Findings

### 1. Token Estimate Storage ✅

**Location:** `PromptDetail.tsx` line 233; `library.ts` storage usage breakdown  
**What:** Simple heuristic: `Math.ceil(finalText.length / 4)`  
**Analysis:**
- Token count is computed in-browser only
- Never persisted to localStorage
- Never sent to any external service
- Displayed only in the UI for user reference ("~X chars · ~Y tokens")
- **Risk:** None. This is a stateless UI calculation.

---

### 2. Run History Storage (Runs Module) ⚠️ **ACCEPTABLE WITH USER CONTROL**

**Location:** `src/lib/runs.ts` (localStorage key: `promptlib:runs:<promptId>`)

**What is stored per run:**
```typescript
{
  id: string;              // Local UUID
  ranAt: ISO timestamp;    // When the run completed
  model: string;           // "claude-opus-4-7", etc.
  values: {...};           // Variable substitutions at run time
  sentPrompt: string;      // Full substituted prompt text ← SENSITIVE
  response: string;        // Claude's full response ← SENSITIVE
  status: "completed" | "aborted" | "errored";
  errorMessage?: string;   // If status === "errored"
  label?: string;          // User-added tag (F-n2-11)
}
```

**Cap & Safeguards:**
- **Max 10 runs** per prompt (`RUNS_PER_PROMPT_CAP = 10`)
- **Response truncation:** `MAX_RESPONSE_CHARS_PERSISTED = 32_000` (~32 KB)
- **User deletion:** `removeRun()` and `clearRuns()` fully remove entries on demand
- **Cascade cleanup:** When a prompt is deleted, `purgePromptStorage(id)` wipes all per-prompt keys in one call
- **Quota protection:** `writeJSON()` in library.ts catches `QuotaExceededError` and surfaces it via a user-facing banner instead of failing silently

**Privacy Considerations:**
1. **Prompt content retention:** The `sentPrompt` field stores the full expanded prompt. If a prompt contains:
   - Secret values (API keys, credentials) → risk of localStorage access via browser dev tools
   - Personal data (names, dates, IDs) → retained for 10 runs
   - Sensitive instructions → cached locally
2. **Response content retention:** Claude's full response is stored. If it contains:
   - PII echoed from the prompt
   - Sensitive recommendations or analysis
   - Structured data (JSON, code) the user may want confidential
   → All remain in localStorage until explicitly deleted

**Assessment:** This is a **design choice, not a flaw**. The user is:
- Running Claude **in their own browser** with **their own API key**
- Receiving responses **in their own browser**
- Explicitly choosing to save runs for reference

The risk is mitigated by:
- User visibility (runs are shown in the UI with delete buttons)
- Opt-in deletion (no auto-purging; user controls what stays)
- Browser sandboxing (localStorage is origin-scoped; accessible only to code on that origin)
- Reasonable caps (10 runs, 32 KB response limit)

**Verdict:** No privacy violation. User should be **informed** (via tooltip/help text) that run history is stored locally and may include sensitive data—recommend deletion before sharing the browser or device.

---

### 3. Variable Values Storage (F2 Feature) ✅ **ACCEPTABLE**

**Location:** `src/lib/library.ts` (`promptlib:values:<promptId>`)

**What:** User-typed variable values, e.g. `{{author}}="John Doe"`, `{{tone}}="professional"`

**Analysis:**
- Only stores the variable name → value mapping, not the final prompt
- Cached for UX convenience (reopening a prompt remembers where you left off)
- Cleared when user clicks "Clear" button in PromptDetail
- Cleared when the parent prompt is deleted
- **Not personally identifiable** unless the user types PII into a variable (at which point they chose to do so)

**Verdict:** Safe. User has explicit control.

---

### 4. Settings Storage (API Key, Model, Max Tokens) ⚠️ **CREDENTIAL HANDLING OK, DOCUMENTED**

**Location:** `src/lib/settings.ts` (keys: `promptlib:apiKey`, `promptlib:model`, `promptlib:maxTokens`)

**API Key Storage:**
- Stored plaintext in localStorage
- **Transmitted only to `https://api.anthropic.com/v1/messages` via POST** with explicit header `"anthropic-dangerous-direct-browser-access": "true"`
- Never sent to any other endpoint
- User responsible for rotating key if device is compromised

**Analysis:**
- This is a **necessary evil** for a browser-based client-side app (no backend)
- Alternatives (server-side key relay, OAuth) would require backend infrastructure
- The explicit "dangerous-direct-browser-access" header signals to users and auditors that this is intentional
- User instructions should warn: "Keep this key secret. If the device is compromised, rotate your API key in Anthropic settings."

**Verdict:** **Acceptable**. Document the risk in README or Settings modal.

---

### 5. Storage Quota & Private-Mode Handling ✅

**Location:** `library.ts` writeJSON() + HomeClient failure banner

**Analysis:**
- `writeJSON()` catches `QuotaExceededError` and `NS_ERROR_DOM_QUOTA_REACHED` (Firefox)
- Surfaces failures via a registered handler, displayed as a top-of-page banner
- No silent data loss
- SSR-safe (returns empty fallback in non-browser context)
- Private/incognito mode: graceful degradation (settings won't persist, but app still works)

**Verdict:** Best-practice error handling.

---

## Data Retention Summary

| Data Type | Storage Location | Retention | User Control | Risk |
|-----------|------------------|-----------|--------------|------|
| Token estimates | Memory only (not persisted) | Session | N/A | None |
| Run history | localStorage (per-prompt) | Manual | Delete runs, clear all, cascade on prompt delete | Low; capped, user-visible |
| Variable values | localStorage (per-prompt) | Manual | Clear button, cascade on delete | None; non-PII |
| API key | localStorage | Manual | Can delete/overwrite in Settings | Medium; plaintext, browser-scoped |
| Model choice | localStorage | Manual | Can change in Settings | None |
| Max tokens | localStorage | Manual | Can change in Settings | None |

---

## Recommendations

### 1. Strengthen User Awareness (Non-blocking, UX)
- [ ] Add a tooltip to the Run History section: "Run history includes your prompts and Claude's responses. **This data is stored locally on your device.** Delete runs you don't need."
- [ ] Add a warning in Settings under API Key: "Your API key is stored on this device. Keep it secret. If compromised, rotate your key in your Anthropic account."
- [ ] Consider a "Clear All Run History" button in Settings for power users.

### 2. Document Storage Limits in Code
- [ ] Add a brief comment in `runs.ts` header explaining the 10-run cap and 32 KB truncation rationale.
- [ ] Link to privacy docs/help page from Settings.

### 3. Optional: Encryption Layer (Future, if handling very sensitive use cases)
- [ ] If future users report discomfort storing prompts locally, consider optional client-side encryption (e.g., crypto.subtle) of the `sentPrompt` + `response` fields. Trades UX (can't search history) for privacy.
- [ ] **Not required for v1.** Keep localStorage simple unless demand emerges.

---

## Compliance Check

| Regulation | Applicability | Status |
|-----------|---------------|--------|
| **GDPR** (EU user data) | No server-side storage, user controls all data locally. User can export or delete via browser. | ✅ Compliant |
| **CCPA** (CA user data) | No third-party data collection. No profiling or sale. User has full access/delete rights. | ✅ Compliant |
| **HIPAA** (if handling health data) | Not designed for health data. User must ensure their own PHI handling if they enter it into a prompt. | ⚠️ User responsibility |
| **Children's Privacy (COPPA)** | Not marketed to children; no special handling. If minors use it, same rules as adults. | ✅ N/A (age-agnostic) |

---

## Conclusion

**Privacy Risk Level: LOW**

The Prompt Library Tool's storage model is sound for a browser-based client-side application:
1. **No external PII collection** — all sensitive data stays in the user's browser
2. **User-controlled retention** — runs are deletable on demand, capped at 10/prompt, responses are truncated
3. **Transparent quota handling** — storage failures are user-visible
4. **No tracking, profiling, or third-party sharing**

The one caveat: **users should be aware that run history contains their full prompts and responses** and should delete sensitive conversations before sharing a device or browser profile.

**Ready for production with cosmetic UX improvements** (tooltips + warning text). No blocking privacy issues.

---

**Next Steps for Sky:**
- If you want to deploy: add the recommended warning text in Settings/Run History sections
- If you want to add more features: run Jordan check on any new data retention (e.g., export format, analytics, collaborative features)
