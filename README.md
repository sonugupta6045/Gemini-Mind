# AI Reflection Journal & Synthesis Workspace

A user-authenticated web application for multi-turn personal reflections, brainstorming, and executive synthesis powered by **Gemini 3.6 Flash** and **Cloud Firestore** user data isolation.

## Architecture Overview

```
               [ User / Browser ]
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
 [ Firebase Google Auth ]     [ Next.js 15 App ]
          │                         │
          ▼                         ▼
[ Firestore Vault: ]        [ Server API Routes ]
 /users/{userId}/journals           │
                                    ▼
                          [ Gemini 3.6 Flash ]
                        (Resilient Fallback Ladder)
```

## Security & Isolation

### 1. Firestore Security Rules
All journal entries and user reflections are isolated to the specific authenticated Google account using owner-bound security paths:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/journals/{journalId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 2. Secret Management & API Protection
- The `GEMINI_API_KEY` is maintained exclusively on the server side in API routes (`/api/chat`, `/api/synthesize`) and is never exposed to the client browser.
- Multi-model fallback ladder (`gemini-3.6-flash` -> `gemini-3.1-flash-lite` -> `gemini-flash-latest` -> `gemini-3.7-flash`) ensures uninterrupted service during model updates or rate limit recovery.

---

## Google Cloud & Deployment Setup

### 1. Google Cloud Secret Manager Configuration
To securely store and inject credentials in production:

```bash
# Create secret in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant Cloud Run runtime service account permission to access the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 2. Cloud Run Deployment & Campaign Verification
Deploy the application with container build and apply the verification label:

```bash
# Build and deploy to Cloud Run
gcloud run deploy ai-reflection-journal \
  --source . \
  --region us-central1 \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --allow-unauthenticated

# Apply challenge verification binding
gcloud run services update ai-reflection-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## Interactive Functional Test Walkthrough

Follow these steps to manually verify every interaction and flow in the app:

### Test Scenario 1: Authentication & Landing Flow
1. Open the application landing page.
2. Verify the landing page displays feature pillars, security notices, and the **Sign In with Google** button.
3. Click **Sign In with Google** and complete the popup authorization.
4. Confirm redirection to the authenticated private workspace.

### Test Scenario 2: Journal Creation & Multi-Turn Gemini Reflection
1. Click **New Reflection Entry** on the left sidebar.
2. Select **Reflect** mode in the top mode selector.
3. Type a journal entry: *"I'm reflecting on how to transition my side project to a full-time venture."* and press Enter.
4. Verify that:
   - The user message appears immediately on the right side.
   - The status indicator indicates saving to Firestore.
   - Gemini responds with an empathetic, multi-point reflection.
5. Send a follow-up: *"What are 3 risk mitigation strategies for this move?"*
6. Verify Gemini retains full multi-turn conversational context.

### Test Scenario 3: AI Executive Synthesizer & Brainstorming
1. Click the **AI Synthesize** button in the header.
2. Confirm the loading animation runs.
3. Inspect the right sidebar to confirm:
   - **Executive Synthesis**: Concise summary of user dilemmas and findings.
   - **Brainstormed Action Ideas**: Bulleted action avenues.
   - **Taxonomy Tags**: Contextual tags (e.g. `#Strategy`, `#Career`).
4. Refresh the page and confirm that all notes, messages, summaries, and tags reload from Firestore.

### Test Scenario 4: User Data Isolation & Deletion
1. In the sidebar, search for a keyword from your entry using the search bar.
2. Confirm the filter instantly matches the title and summary.
3. Hover over an entry and click the **Trash** icon.
4. Confirm the entry is permanently deleted from Firestore.
5. Click **Sign Out** to return safely to the public landing page.
