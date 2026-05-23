Research the topic, write a LinkedIn post in Roee's voice, and publish it live.

**Topic:** $ARGUMENTS

---

## Step 1 — Research (run searches in parallel)

Use WebSearch to gather fresh, specific insights. Run all three simultaneously:

1. `"$ARGUMENTS" analysis insights data 2025`
2. `"$ARGUMENTS" statistics trends industry impact`
3. `site:reddit.com "$ARGUMENTS"` — find raw practitioner opinions, complaints, or surprising angles

Extract from the results:
- 2-3 concrete data points or statistics
- 1-2 contrarian or non-obvious angles
- Any real-world examples or case studies
- What practitioners/Reddit actually think vs. what media claims

---

## Step 2 — Write the Post

Read /Users/roeea/Documents/Linkedin/profile.md for Roee's background and proof points.

Write a LinkedIn post following this structure:

**Hook** (line 1-2): A bold, specific claim or non-obvious insight from the research. Not a question, not a vague statement. Make it worth stopping the scroll.

**Numbered Breakdown** (3-5 points): Each point must include a data point, evidence, or specific observation from the research. No generic statements. Tight, analytical, specific.

**Personal Lens** (1-2 sentences): Connect the topic to Roee's real experience — 20 years in cybersecurity, 11 years in CS, building with Claude Code/Antigravity, teaching students about AI. Pick whichever is most relevant to the topic.

**CTA**: One sharp sentence. A question that makes the reader think, or a challenge to act.

**Hashtags**: 2-3 max, directly relevant.

Rules:
- Write in first person as Roee
- No emojis unless they genuinely add meaning (rare)
- No "I'm excited to share..." or hollow openers
- No "The future of X is Y" filler
- Max ~1,300 characters (LinkedIn sweet spot)
- Every claim must tie back to actual research findings from Step 1
- Analytical tone: data, frameworks, real experience — not hype

---

## Step 3 — Save & Publish

1. Write the final post to `/tmp/linkedin_draft.txt`
2. Display the post clearly so the user sees exactly what will go live
3. Run: `node /Users/roeea/Documents/Linkedin/post_linkedin.js /tmp/linkedin_draft.txt`
4. Report whether the post was published successfully

If the Playwright script errors with "Session expired", tell the user to run: `node /Users/roeea/Documents/Linkedin/linkedin_setup.js`
If it errors with "module not found", tell the user to run: `cd /Users/roeea/Documents/Linkedin && npm install && npx playwright install chromium`
