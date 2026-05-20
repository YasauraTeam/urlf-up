# UrLfXUp - V2 Architecture Roadmap (Matching Engine)
*Target: Execute only after reaching 1,000 active users or $1M GMV.*

## What Changed (and Why)

### Original Problems
The original engine had two fundamental weaknesses: a binary industry check (in/out, no nuance) and a naïve skill score with no fuzzy matching, no confidence tracking, and no explainability. It also had no tie-breaking, no data-quality awareness, and no async support for batch workloads.

---

## v2 Architecture

### 6-Axis Weighted Scoring
Instead of 2 hard-coded axes, the engine now scores across **6 independent dimensions**, each returning its own `raw`, `weighted`, and `confidence` value:

| Axis | Weight | What it scores |
|---|---|---|
| `capital` | 20% | Proportional credit from floor → ideal, not just a binary gate |
| `industry` | 25% | Exact = 100, multi-industry = 80, missing = 50 (with low confidence) |
| `skills` | 25% | Fuzzy matching (substring = 0.6×), nice-to-have bonus up to +10pts |
| `stage` | 15% | Exact = 100, adjacent stage = 50 partial credit |
| `geography` | 10% | Exact match / remote-compatible / mismatch |
| `risk` | 5% | Delta between `riskTolerance` and `riskAppetite` as a 0–100 score |

### Confidence Intervals Per Axis
Every axis returns a `confidence` value (0–1) reflecting data completeness. Missing `geography`, undeclared `stage`, or empty `skills` all reduce confidence. The aggregate confidence score surfaces as a warning when below 60%, so you know *when to trust the score* and when to gather more data. 

### Fuzzy Skill Matching
The old engine used `Array.includes()` — exact string equality only. v2 uses `fuzzySkillScore()`: exact match = `1.0`, substring overlap (e.g. `"marketing"` covering `"digital marketing"`) = `0.6`. This prevents penalising near-matches and rewards investors whose skills partially satisfy a requirement. 

### Capital Axis — Proportional, Not Binary
The old code gave `0` below the floor and `60` flat above it. v2 gives `60` at the minimum floor and scales to `100` as the investor's capital approaches the `idealCapital` ceiling:

```javascript
const raw = Math.min(100, 60 + ((surplus - required) / (ideal - required + 1)) * 40);
A visionary asking for $100K with $250K ideal now distinguishes between a $110K investor (raw: 64) and a $400K investor (raw: 100).
Match Tier Classification
Scores map to named tiers for human consumption — no magic numbers scattered in UI code:
90–100 → Perfect Match
75–89  → Strong Match
50–74  → Viable Match
30–49  → Weak Match
0–29   → Rejected
Pluggable Weight Profiles
createWeightProfile({ industry: 0.5, skills: 0.3 }) distributes the remaining 20% evenly across unspecified axes. Throw RangeError if overrides exceed 1.0. You can pass any profile directly to calculateMatch() or rankMatches().
Async Batch Generator
JavaScript
for await (const { visionary, matches } of batchRankMatches(allVisionaries, capitalPool, { signal })) {
  // stream results as each visionary completes
}
batchRankMatches is an AsyncGenerator that yields results batch-by-batch, yielding to the event loop between batches. Supports AbortSignal for cancellation.
rankMatches — Multi-Key Tie-Breaking
Ties broken by confidence, then by capital.raw — not just arbitrary order. Also gains includeRejected: true (useful for debugging why investors were filtered out) and limit: N for top-N results.
formatMatchReport() — Terminal-Ready Diagnostics
Plaintext
━━━ Match Report: GreenFund ━━━
  Score : 97/100  |  Tier: Perfect Match  |  Confidence: 89%
  Status: ✅ MATCH

  Axis Breakdown:
    Capital Adequacy         ██████████  100/100  (100% conf)
      └─ $200,000 available vs $100,000 required
    ...