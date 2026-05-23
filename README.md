# roeeai-linkedin-skill

```
 ██████╗   ██████╗  ███████╗███████╗ █████╗ ██╗
 ██╔══██╗ ██╔═══██╗ ██╔════╝██╔════╝██╔══██╗██║
 ██████╔╝ ██║   ██║ █████╗  █████╗  ███████║██║
 ██╔══██╗ ██║   ██║ ██╔══╝  ██╔══╝  ██╔══██║██║
 ██║  ██║ ╚██████╔╝ ███████╗███████╗██║  ██║██║
 ╚═╝  ╚═╝  ╚═════╝  ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝

          ── LinkedIn Skill for Claude Code ──
```

> Research any topic. Write in your voice. Post live — one command.

---

## What it does

Type `/linkedin <topic>` in Claude Code and the skill handles everything:

```
  ┌──────────────────────────────────────────────────────────┐
  │                                                          │
  │  1. RESEARCH    Searches the web + Reddit in parallel    │
  │     ─────────   to extract real data, stats, and         │
  │         │       practitioner opinions on your topic       │
  │         ▼                                                │
  │  2. WRITE       Reads your profile.md and generates an   │
  │     ───────     analytical post in your personal voice — │
  │         │       no fluff, no hollow openers               │
  │         ▼                                                │
  │  3. POST        Playwright opens Chrome, authenticates,  │
  │     ──────      and publishes the post live on LinkedIn   │
  │                                                          │
  └──────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- [Claude Code](https://claude.ai/code) CLI installed
- Node.js 18+
- A LinkedIn account

---

## Installation

**1. Clone the repo:**

```bash
git clone https://github.com/roeea2/roeeai-linkedin-skill.git
cd roeeai-linkedin-skill
```

**2. Install dependencies:**

```bash
npm install
npx playwright install chromium
```

**3. Set your skill directory path:**

Open `.claude/commands/linkedin.md` and replace every occurrence of `SKILL_DIR` with the absolute path to the folder where you cloned this repo:

```
# Example — replace this:
SKILL_DIR/profile.md
node SKILL_DIR/post_linkedin.js

# With your actual path:
/Users/yourname/projects/roeeai-linkedin-skill/profile.md
node /Users/yourname/projects/roeeai-linkedin-skill/post_linkedin.js
```

There are **3 occurrences** of `SKILL_DIR` in that file.

**4. Personalize your profile:**

Open `profile.md` and replace the contents with your own background, proof points, and tone preferences. This is the source of truth for how every post is written — be specific. The more detail you add, the more the posts will sound like you.

```markdown
# Your Name — Background & Proof Points

## Who I Am
- Your role, years of experience, industry
- Key career milestones and transitions
- What makes your perspective unique

## Expert Areas
- Topic 1 — how long, what depth
- Topic 2 — specific achievements or numbers

## Core Belief
The thesis behind your content — what do you want your audience to take away?

## Tone
- Analytical / Storytelling / Direct / Conversational
- What to avoid (e.g. no emojis, no buzzwords)
```

**5. Authenticate with LinkedIn (one time only):**

```bash
node linkedin_setup.js
```

A browser window opens. Log in to LinkedIn manually. Once you reach your feed, the session is saved to `./linkedin-auth/` and reused automatically. You only need to do this again if your session expires (typically after a few weeks).

---

## Usage

Inside Claude Code, type:

```
/linkedin <topic>
```

**Examples:**

```
/linkedin why most AI agents fail in enterprise environments
/linkedin the real cost of ignoring cybersecurity in SMBs
/linkedin what 20 years in sales taught me about customer retention
/linkedin agentic AI is already here and most teams aren't ready
/linkedin open source vs enterprise software — the hidden tradeoffs
```

Claude will:
1. Search the web and Reddit for real data and contrarian angles
2. Read your `profile.md` to understand your voice and proof points
3. Write a post grounded in the research and your experience
4. Display the draft so you can see exactly what will go live
5. Publish it directly to your LinkedIn feed via Playwright

---

## File structure

```
.
├── .claude/
│   └── commands/
│       └── linkedin.md      # The /linkedin skill — edit to change post format
├── profile.md               # Your background, proof points & tone rules
├── post_linkedin.js         # Playwright browser automation — handles posting
├── linkedin_setup.js        # One-time auth setup — saves your session locally
├── package.json
└── .gitignore               # Excludes linkedin-auth/ (your saved session)
```

---

## Customization

| What you want to change | Where |
|---|---|
| Your background, expertise, tone | `profile.md` |
| Post structure (hook, breakdown, CTA) | `.claude/commands/linkedin.md` — Step 2 |
| Max length, hashtag count, emoji rules | `.claude/commands/linkedin.md` — Rules section |
| Research sources or search queries | `.claude/commands/linkedin.md` — Step 1 |
| Browser behavior, Playwright selectors | `post_linkedin.js` |

---

## Troubleshooting

**Session expired:**
```bash
node linkedin_setup.js
```

**Module not found / Playwright not installed:**
```bash
npm install && npx playwright install chromium
```

**Post button not found / LinkedIn UI changed:**

LinkedIn periodically updates their DOM. Open `post_linkedin.js` and update the selector arrays `startPostSelectors` and `postButtonSelectors` with the current class names or aria labels from your browser's DevTools.

---

## How it works under the hood

The skill is a plain Markdown file (`.claude/commands/linkedin.md`) that Claude Code reads when you type `/linkedin`. It instructs Claude to:

1. Use the built-in `WebSearch` tool to research the topic across the web and Reddit
2. Read your `profile.md` to load your personal context
3. Generate an analytical LinkedIn post grounded in the research
4. Write the post to `/tmp/linkedin_draft.txt`
5. Call `post_linkedin.js` via Bash — a Playwright script that opens a persistent Chrome session, navigates to your LinkedIn feed, opens the composer, pastes the content, and clicks Post

No external APIs, no subscriptions, no cloud services. Just Claude Code + Playwright.

---

## About

Built by **Roee** — mechanical engineer, 20+ years in cybersecurity (offensive & defensive), 11 years in customer success, AI builder, high school teacher, and student at Tel Aviv University. Passionate about agentic AI and building real systems with Claude Code.

> The agentic world is already here. This repo is proof.

---

## License

MIT
