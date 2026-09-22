# EngineerAI — Build a Production Web Interface Alongside the Existing Mobile App

Act as a **Senior Full-Stack Engineer + Product Designer** working on our existing project, **EngineerAI — AI Field Service Copilot**.

## Context

We already have a functioning **mobile application** built with:

* Flutter
* FastAPI backend
* Supabase Auth / PostgreSQL / Storage
* Gemini / OpenAI-compatible LLM layer
* ChromaDB-based RAG
* Riverpod state management
* Existing inspection workflow and AI modules

The existing application is primarily designed as a **mobile technician interface**.

Now we want to take the same product live as a **responsive web application for PC/laptop users**.

The web interface should use the **same backend, database, authentication, AI pipeline, inspection data, storage, and API contracts** wherever possible.

### VERY IMPORTANT

**Do NOT rebuild the backend.**

**Do NOT create a second database.**

**Do NOT duplicate the AI logic.**

**Do NOT create a fake/demo-only frontend.**

The goal is:

> **One EngineerAI product with two clients:**
>
> * Mobile → Flutter
> * Web → Responsive PC/Web interface

Both should operate simultaneously against the same backend and Supabase project.

---

# 1. First: Inspect the Existing Project

Before writing code, thoroughly inspect the repository.

Understand:

* Existing Flutter application
* FastAPI backend
* API routes
* Supabase schema
* Authentication flow
* Storage structure
* Inspection data model
* AI module outputs
* Existing design/theme
* Navigation flow
* Shared concepts/components
* Environment configuration
* Existing deployment configuration

Read the actual implementation rather than assuming the architecture from this prompt.

Identify:

1. What already exists and should be reused.
2. What APIs already support the web interface.
3. What backend changes, if any, are genuinely necessary.
4. Which functionality is mobile-specific and should be adapted for desktop.
5. Any missing API capability required by the web UI.

**Do not modify anything yet.**

First produce a short implementation assessment with:

* Current architecture
* Existing reusable APIs
* Existing Supabase tables/storage
* Existing authentication flow
* Existing inspection lifecycle
* Recommended web stack
* Files that will need modification
* Files that should remain untouched

Then proceed with implementation.

---

# 2. Web Technology

Create the web client using a modern production-ready stack.

Preferred:

* **Next.js**
* TypeScript
* App Router
* Tailwind CSS
* shadcn/ui where useful
* Lucide icons
* Supabase JS client
* Existing FastAPI API as the business/AI backend

Deployable to:

* Vercel for frontend
* Existing backend deployment for FastAPI
* Existing Supabase project

The architecture should remain:

```text
                    ┌─────────────────────┐
                    │      Supabase       │
                    │ Auth / DB / Storage │
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │     FastAPI API     │
                    │  AI + RAG + Reports  │
                    └─────────┬───────────┘
                              │
               ┌──────────────┴──────────────┐
               │                             │
       ┌───────▼────────┐           ┌────────▼────────┐
       │ Flutter Mobile │           │   Next.js Web   │
       │    Client      │           │     Client      │
       └────────────────┘           └─────────────────┘
```

The web client should **consume the existing APIs**, not bypass the backend for business logic.

---

# 3. Product Goal

The web version should NOT simply look like the mobile application stretched horizontally.

Design a proper **desktop field-service/industrial operations interface**.

The mobile app is optimized for:

> Technician → inspect → diagnose → repair → report

The desktop web application should additionally feel suitable for:

> Engineer / supervisor → monitor → inspect → investigate → review → manage → report

It should therefore take advantage of the larger screen.

---

# 4. Design Direction

The visual quality is extremely important.

Avoid:

* Generic AI dashboards
* Purple/blue gradient backgrounds
* Excessive glassmorphism
* Huge rounded cards everywhere
* Generic SaaS templates
* Fake charts
* Decorative AI imagery
* Excessive animations
* "AI-powered" marketing clichés
* Overuse of badges
* Dashboard clutter
* Random gradients
* Excessive shadows
* Childish UI

The product should feel like a serious **industrial engineering / field operations platform**.

Think:

* Linear
* Vercel
* Raycast
* modern industrial control software
* engineering tools
* premium enterprise SaaS
* clean technical interfaces

But do not copy any one product.

Use a restrained visual system with:

* Strong typography
* Excellent spacing
* Clear hierarchy
* Neutral surfaces
* Subtle borders
* Small purposeful shadows
* Dense but readable information
* Consistent iconography
* Clear status indicators
* Excellent empty/loading/error states

The UI should look credible enough to be presented to:

* industrial companies
* maintenance teams
* engineering managers
* technical judges
* enterprise customers

---

# 5. Responsive Strategy

The web interface must work across:

* 1440px desktop
* 1280px laptop
* 1024px tablet-sized desktop
* smaller screens where reasonably possible

Desktop is the primary target.

Do NOT simply make the mobile UI responsive.

Create layouts specifically for desktop while maintaining responsive behavior.

Use:

* persistent sidebar/navigation where appropriate
* top-level page headers
* split-pane layouts
* tables
* timelines
* inspection summaries
* technical information panels
* larger image previews
* side-by-side diagnosis/reasoning
* expandable evidence sections

---

# 6. Web Application Structure

Create a proper application shell.

Suggested structure:

```text
/app
  /login
  /dashboard
  /inspections
  /inspections/[id]
  /inspections/new
  /history
  /reports
  /settings
```

Adapt this to the existing API and actual product requirements.

---

# 7. Dashboard

Create a useful engineering dashboard rather than a generic SaaS dashboard.

Possible information:

### Overview

* Total inspections
* Inspections today
* Active investigations
* Completed repairs
* Reports generated

### Recent Inspections

Display:

* Machine
* Problem
* Status
* Confidence
* Created time
* Technician/user
* Quick action

### Inspection Status

Useful breakdown of:

* Draft
* Analyzing
* Diagnosed
* Repairing
* Complete

### Operational Insights

If the existing data supports it, surface useful information such as:

* Most common failure types
* Recurring problems
* Average diagnosis confidence
* Repair completion trends

**Do not fabricate analytics that the backend/data model cannot support.**

If the current API doesn't expose something, either:

1. derive it safely from existing data, or
2. leave it out.

Do not create fake numbers.

---

# 8. New Inspection

The web version should support the same core inspection workflow.

Desktop experience:

```text
Select Department
        ↓
Select Machine
        ↓
Select Problem
        ↓
Upload / Drag & Drop Photo
        ↓
AI Vision Analysis
        ↓
Guided Investigation Questions
        ↓
Diagnosis
        ↓
Repair Plan
        ↓
Repair Checklist
        ↓
Generate Report
```

The existing API endpoints should be reused:

```text
GET  /departments
GET  /departments/{id}/machines
GET  /machines/{id}/problems

POST /inspections
POST /inspections/{id}/vision-analysis
POST /inspections/{id}/questions
POST /inspections/{id}/answers
POST /inspections/{id}/diagnose
POST /inspections/{id}/repair-plan
POST /inspections/{id}/report

GET /inspections
GET /inspections/{id}
```

Do not duplicate AI logic inside Next.js.

---

# 9. Inspection Detail Page

This should be one of the strongest parts of the application.

Design a professional engineering investigation workspace.

Suggested layout:

```text
┌───────────────────────────────────────────────────────────────┐
│ Inspection #123        Electric Motor       COMPLETE          │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Machine Photo             Diagnosis                          │
│  ┌──────────────────┐      ┌─────────────────────────────┐    │
│  │                  │      │ Root Cause                  │    │
│  │     IMAGE        │      │ Bearing degradation         │    │
│  │                  │      │ Confidence: 87%             │    │
│  └──────────────────┘      └─────────────────────────────┘    │
│                                                               │
│  Investigation Timeline     Evidence                          │
│  ─────────────────────      ─────────────────────────────     │
│  Vision analysis            Knowledge source                  │
│  Questions                  Observed symptoms                 │
│  Diagnosis                  Ruled-out causes                  │
│  Repair plan                                                   │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ Repair Plan                                                    │
│                                                               │
│ ✓ Safety isolation                                            │
│ ✓ Inspect bearing                                             │
│ ○ Replace damaged component                                   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

Adapt the exact design to the existing data.

---

# 10. AI Transparency

Do not present AI as a black box.

The existing product already has:

* Vision
* Investigation
* Question
* Knowledge/RAG
* Reasoning
* Repair

Represent this clearly in the web interface.

For example:

```text
Inspection Pipeline

01  Vision Analysis        ✓
02  Investigation          ✓
03  Guided Questions       ✓
04  Knowledge Retrieval    ✓
05  Root Cause Reasoning   ✓
06  Repair Plan            ✓
07  Report                 ✓
```

Allow users to understand:

* What the AI observed
* What questions were asked
* What evidence was retrieved
* Why a diagnosis was suggested
* What alternatives were ruled out
* Confidence level
* Recommended repair steps

Do not expose internal prompts, API keys, or sensitive implementation details.

---

# 11. Knowledge / Evidence Presentation

The backend RAG system returns knowledge snippets with source filenames.

Use this information in the UI.

Show evidence in a clean expandable section such as:

```text
Evidence

▸ Bearing inspection procedure
  Source: vibration_bearing.md

▸ Motor overheating causes
  Source: overheating_motor.md
```

Do not invent citations or sources.

Use only evidence actually returned by the backend.

---

# 12. Photo Experience

Desktop users should be able to:

* Drag and drop an image
* Click to browse
* Preview image
* Replace image
* Remove image
* Submit for analysis

Preserve the existing architecture where photos are uploaded directly to Supabase Storage rather than unnecessarily routing large files through FastAPI. The existing system intentionally uses direct client → Supabase Storage uploads.

Compress images appropriately before upload where practical.

---

# 13. Authentication

Reuse the existing Supabase authentication architecture.

Do NOT create a second authentication system.

Ensure:

* Login/session handling works
* JWT/session is correctly passed to FastAPI
* Users only see their own inspection data according to existing RLS/API behavior
* Refreshing the page does not destroy the session
* Protected routes redirect appropriately

If the current app uses anonymous authentication, inspect the existing implementation before changing it.

Do not introduce email/password authentication unless it is actually required by the existing project.

---

# 14. Reports

The existing backend generates PDF reports.

The web interface should:

* Show report availability
* Preview/report metadata where possible
* Allow opening/downloading the generated PDF
* Keep report generation on the backend

Do not recreate ReportLab/report-generation logic in Next.js.

---

# 15. History

Create a proper desktop inspection history experience.

Use:

* searchable table/list
* filters
* status
* machine
* problem
* date
* confidence where available

Example:

```text
INSPECTION HISTORY

Search inspections...

Machine          Problem       Status       Confidence     Date
Electric Motor   Vibration     Complete     91%             Today
Electric Motor   Noise         Repairing    78%             Yesterday
Electric Motor   Overheating   Diagnosed    84%             Sep 20
```

Only show fields actually available from the API.

---

# 16. Loading States

AI operations may take time.

Do NOT use generic:

> "Loading..."

Create purposeful system-status states.

Example:

```text
ANALYZING INSPECTION

Vision analysis
Detecting visible components and abnormalities       ✓

Investigation
Generating possible causes                            ✓

Knowledge retrieval
Searching technical knowledge                         ✓

Reasoning
Evaluating evidence                                   ●
```

Use subtle animations, not flashy AI effects.

---

# 17. Error Handling

Handle:

* API failures
* expired sessions
* network failures
* image upload failure
* AI timeout
* malformed backend responses
* report-generation failure
* missing inspection
* unauthorized access

Never show raw stack traces to users.

Provide actionable recovery:

```text
Unable to complete diagnosis.

The AI service did not respond.

[Retry Diagnosis]
```

---

# 18. Shared Backend Contract

The web application should be strongly typed around the existing FastAPI schemas.

Create TypeScript types/interfaces that mirror the actual backend response models.

Do NOT independently redefine the business model differently from Flutter.

If practical, establish a single source of truth for API types, but do not introduce unnecessary tooling or architectural complexity.

---

# 19. API Client

Create a clean API client layer.

For example:

```text
lib/
  api/
    client.ts
    inspections.ts
    machines.ts
    reports.ts
```

Centralize:

* Base URL
* Authentication token handling
* Error handling
* Request helpers

Do not scatter raw `fetch()` calls throughout components.

---

# 20. State Management

Use the simplest appropriate solution.

Do not introduce Redux or a huge state-management architecture unless the existing complexity genuinely requires it.

Prefer:

* Server state/query caching where useful
* React state for local UI
* URL state for filters/search
* Supabase session state for authentication

Keep the architecture understandable.

---

# 21. Performance

The application should feel fast.

Pay attention to:

* code splitting
* image optimization
* lazy loading
* unnecessary API calls
* duplicate requests
* loading skeletons
* caching read-only data
* avoiding huge client bundles

Do not sacrifice maintainability for premature optimization.

---

# 22. Vercel Deployment

Prepare the web app for deployment on Vercel.

Create/verify:

```text
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Never expose:

* Supabase service-role key
* LLM API keys
* OpenRouter API keys
* backend secrets

The browser should only receive public client-side configuration.

The existing backend remains responsible for privileged operations.

---

# 23. Production Configuration

Create:

```text
.env.example
```

Document the required environment variables.

Ensure:

* development works locally
* production works on Vercel
* API URL can be switched cleanly
* CORS is configured correctly in FastAPI for the Vercel domain

Do not hardcode localhost URLs.

---

# 24. Visual Quality Requirements

Before considering the task complete, inspect every major page visually.

The final web interface should feel like a **real product**, not a generated prototype.

Pay particular attention to:

* spacing
* typography
* alignment
* sidebar width
* table density
* card hierarchy
* button sizing
* icon consistency
* empty states
* loading states
* error states
* responsive behavior
* long text
* image handling
* accessibility

Avoid creating dozens of one-off components.

Build a small, coherent design system.

---

# 25. Important Product Principle

The mobile and web applications must feel like the **same product**, but not the same layout.

Mobile:

> optimized for technicians working beside machinery.

Web:

> optimized for engineers/supervisors reviewing and managing inspections on a large screen.

Same:

* branding
* terminology
* backend
* AI pipeline
* data
* inspection states
* core workflow
* visual language

Different:

* layout
* information density
* navigation
* interaction patterns
* desktop productivity features

---

# 26. Implementation Rules

Follow these strictly:

1. **Inspect before modifying.**
2. Reuse existing backend APIs wherever possible.
3. Do not duplicate AI logic.
4. Do not duplicate database logic.
5. Do not create fake data.
6. Do not break the Flutter application.
7. Do not migrate technologies unnecessarily.
8. Do not introduce microservices.
9. Do not over-engineer.
10. Keep components reusable.
11. Keep TypeScript strongly typed.
12. Keep secrets server-side.
13. Keep the web client deployable to Vercel.
14. Keep the existing mobile app fully functional.
15. Test the complete inspection flow after implementation.

---

# 27. Definition of Done

The implementation is complete only when:

### Web

* [ ] Next.js application builds successfully
* [ ] No TypeScript errors
* [ ] No console errors in normal operation
* [ ] Login/session works
* [ ] Dashboard works
* [ ] New inspection works
* [ ] Image upload works
* [ ] Vision analysis works
* [ ] Guided questions work
* [ ] Diagnosis works
* [ ] Repair plan works
* [ ] Checklist works
* [ ] Report generation works
* [ ] History works
* [ ] Inspection detail works
* [ ] Loading states work
* [ ] Error states work
* [ ] Responsive desktop layout works
* [ ] Production environment variables are documented
* [ ] Vercel deployment configuration is ready

### Existing Mobile App

* [ ] Flutter app still builds
* [ ] Existing APIs still work
* [ ] Existing inspection workflow still works
* [ ] Existing Supabase storage/auth behavior is unaffected

### Production

* [ ] FastAPI CORS supports production frontend
* [ ] Vercel environment variables documented
* [ ] No secrets exposed client-side
* [ ] Production API URL configurable
* [ ] Full inspection tested against deployed backend

---

# 28. Development Process

Work in this order:

### Phase 1 — Audit

Inspect the entire existing project.

Do not modify code.

Report your findings.

### Phase 2 — Architecture

Define:

* Next.js structure
* API client
* authentication strategy
* page structure
* reusable UI components
* data flow

Keep it concise.

### Phase 3 — Foundation

Implement:

* Next.js app shell
* theme
* typography
* sidebar
* navigation
* authentication
* API client
* shared components

### Phase 4 — Core Product

Implement:

1. Dashboard
2. Inspection creation
3. Image upload
4. AI pipeline
5. Diagnosis
6. Repair plan
7. Report
8. History
9. Inspection detail

### Phase 5 — Polish

Improve:

* spacing
* typography
* animations
* transitions
* empty states
* loading states
* error states
* responsive behavior
* accessibility

### Phase 6 — Production

Run:

* build
* lint
* typecheck
* API integration checks
* full inspection flow
* production configuration validation

Then provide a final summary of:

* files created
* files modified
* backend changes
* environment variables
* local run command
* Vercel deployment steps
* known limitations

---

# Final Instruction

**Do not stop at creating a visual mockup.**

Build the actual working web client and integrate it with the existing EngineerAI backend.

The final result should be a **production-ready responsive web interface that can be deployed to Vercel and used simultaneously with the existing Flutter mobile application.**

Prioritize:

**working integration > unnecessary architecture > flashy UI**

and

**professional product design > generic AI dashboard aesthetics.**
