# 🌿 Karabo — Workplace AI Assistant

An elegant, low-stimulation "Zen-SaaS" workspace companion designed to streamline professional execution while actively supporting emotional well-being. Built with a soothing, low-contrast visual theme to prevent cognitive fatigue, **Karabo** unifies core productivity tools with an empathetic, context-aware AI coach.

🖥️ **Live Application:** [productivity-assistant-karabo.lovable.app](https://productivity-assistant-karabo.lovable.app/)

---

## 🎨 Design Philosophy: "Zen-SaaS"
Most modern productivity dashboards are cluttered, flashing, and high-contrast—ultimately increasing workplace anxiety. Karabo steps away from overstimulation by using a minimalist aesthetic:
* **Color Palette:** Soft sage greens, charcoal typography, and muted slates.
* **Layout:** Generous whitespace, clean rounded borders, and minimalist iconography.
* **Transitions:** Slow, gentle UI animations and soft shimmer loading states.

---

## 🛠️ Key Features & Architecture

### 1. Unified Workspace Dashboard (`/`)
* A calm command center highlighting your daily metrics (tasks due, open workflows, documents processed).
* Rapid-action shortcuts to navigate your day with minimal friction.

### 2. Context-Aware Communication
* **Smart Email Generator (`/email`):** Instantly drafts tailored corporate correspondence based on target audience (Client, Manager, Team, Vendor) and tone (Formal, Persuasive, Friendly, etc.).
* **Reply Assistant (`/reply`):** Deconstructs messy incoming emails into clear executive summaries, actionable requests, and outputs three distinct strategic reply drafts (e.g., *Assertive*, *Apologetic*, *Concise*).

### 3. Integrated Workflow Optimization
* **Meeting Notes Summarizer (`/notes`):** Processes raw transcripts or document uploads (PDF, DOCX, TXT, MD) to extract key decisions and responsibilities.
* **One-Click Synchronization:** Action items found in meeting transcripts feature a `➕ Add to Schedule` button that instantly injects the item into the task matrix.
* **AI Task Planner (`/planner`):** Automatically segments workflows chronologically (*Today*, *Upcoming*, *Someday*). Features an **AI Prioritize** engine that restructures tasks based on immediate urgency and provides a time-optimization strategy.

### 4. Holistic Workspace Coaching (`/coach`)
* Meet **Karabo**, an encouraging, deeply empathetic workspace and productivity coach. 
* Unlike generic chatbots, Karabo has real-time awareness of your dashboard metrics, active deadlines, and context preferences, referencing them organically.
* **Voice-to-Text Built-in:** Features native browser-level dictation using a microphone interface, allowing users to speak naturally when feeling too overwhelmed to type.
* Features targeted quick-prompts for immediate relief from task paralysis, professional burnout, and massive to-do lists.

### 5. Context Memory Vault (`/memory`)
* A localized intelligence hub where users store persistent professional preferences (e.g., *"Sign all client emails as 'Best, Sam'"*, *"My manager is John Patel"*).
* This background context is automatically applied across all functional modules, preventing repetitive prompting.

---

## 🛡️ Responsible AI, Safety & Privacy

* **PII Detection Guardrail:** Client-side middleware actively scans user inputs for highly sensitive data points (passwords, credit card numbers, API keys) and triggers an intermediate warning before any text is transmitted to language models.
* **Human-in-the-Loop Framework:** Every AI interaction is backed by a visible disclaimer emphasizing user verification before professional deployment.
* **Data Privacy & Security:** To protect user privacy, personal tasks, context memory strings, and emotional coaching chat transcripts remain securely contained within the local device storage environment (`LocalStorage`).

---

## 💻 Tech Stack & Integrations

* **Frontend Framework:** React, TypeScript, Tailwind CSS
* **UI Components & Icons:** Lucide React, Shadcn/ui (Tailwind configurations)
* **Voice Integration:** Native Browser Web Speech API (`SpeechRecognition`)
* **Environment & Deployment:** Managed via Lovable.ai, packaged with Vite

---

## 🚀 Getting Started

### Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation & Local Setup

1. **Clone the repository:**
```bash
   git clone [https://github.com/YOUR_USERNAME/productivity-assistant-karabo.git](https://github.com/YOUR_USERNAME/productivity-assistant-karabo.git)
   cd productivity-assistant-karabo
