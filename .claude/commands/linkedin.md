Research the topic, write a LinkedIn post in the author's voice, and publish it live.

<!-- CONFIGURE: set SKILL_DIR to the absolute path where you cloned this repo -->
<!-- Example: /Users/yourname/projects/roeeai-linkedin-skill               -->
<!-- Update all three occurrences of SKILL_DIR below before using.          -->

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

Read SKILL_DIR/profile.md to load the author's background, proof points, tone rules, and anti-patterns.

Write a LinkedIn post following this structure:

**Hook** (line 1-2): A bold, specific claim or non-obvious insight from the research. Not a question, not a vague statement. Make it worth stopping the scroll.

**Numbered Breakdown** (3-5 points): Each point must include a data point, evidence, or specific observation from the research. No generic statements. Tight, analytical, specific.

**Personal Lens** (1-2 sentences): Connect the topic to the author's real experience using proof points from profile.md. Pick the most relevant angle to the topic.

**CTA**: One sharp sentence — a question that makes the reader think, or a direct challenge to act.

**Hashtags**: 2-3 max, directly relevant.

Rules (override with anything in profile.md):
- Write in first person as the author
- No emojis unless they genuinely add meaning (rare)
- No "I'm excited to share..." or hollow openers
- No "The future of X is Y" filler
- Max ~1,300 characters (LinkedIn sweet spot)
- Every claim must tie back to actual research findings from Step 1
- Tone should match the style described in profile.md

---

## Step 3 — Save & Publish

1. Write the final post to `/tmp/linkedin_draft.txt`
2. Display the post clearly so the user sees exactly what will go live
3. Run: `node SKILL_DIR/post_linkedin.js /tmp/linkedin_draft.txt`
4. Report whether the post was published successfully

If the Playwright script errors with "Session expired", tell the user to run: `node SKILL_DIR/linkedin_setup.js`
If it errors with "module not found", tell the user to run: `cd SKILL_DIR && npm install && npx playwright install chromium`
