# Connexions — making people want to come back, without pressure

Goal: Hafid comes back because each session is interesting, personal and short, and because he can see himself progressing. No streaks, badges, points or guilt. No AI during sessions. Cost stays at about 0 € per day.

## What changes for him

**1. Shorter sessions (8–12 min)**
- About 10 steps per session instead of 13. That means 2 or 3 short paths on one subject each, then one question about daily life.
- Each session has: one familiar subject, one new subject, one thing seen before, 2 or 3 spoken answers.

**2. "We talked about this before"**
- Some questions come back after 2 days and again after a week, introduced by a sentence like "Nous avions parlé de Monet il y a quelques jours."
- A question that gave trouble can come back later in the same session.

**3. A short, warm end of session**
- "Très belle séance aujourd'hui." followed by **one** highlight only, chosen by simple rules. For example: "Vous avez retrouvé 3 mots sans aide." or "Vous avez formulé plusieurs réponses à voix haute."
- A hint about tomorrow, without giving it away. For example: "Demain : une œuvre célèbre, une découverte scientifique, une question de médecine."

**4. Multi-day series and collections**
- Series that run over several days, for example "Les grandes découvertes scientifiques" (Pasteur → pénicilline → ADN → imagerie → neurosciences), "Voyage en Italie" or "Les grands courants artistiques".
- Collections such as "Impressionnisme — 4 / 6 sujets explorés", shown on the home page as a simple line. No competition.
- A "Nouveau" label on recently added themes.
- I will write about 15 new paths for these series, with a fixed, fact-checked text. The new sentences will be recorded once in the Vindemiatrix voice.

**5. Occasional choice**
- Once or twice a week, the session opens with "Aujourd'hui, vous préférez : Art & culture · Sciences · Histoire". The subject he picks takes the main place in that session.

**6. "Cette semaine", improved**
- Shows sessions done, total time, spoken answers, words found and subjects explored, plus one positive sentence.
- After several days away, the home page says "Heureux de vous retrouver." It never mentions a missed day.

**7. Preferences learned little by little**
- Simple rules look at the subjects he finishes, answers out loud or skips, and how often he asks to hear something again.
- His favourite subjects slowly come up more often: about 70 % familiar, 30 % new. He is never shut into a single subject. None of this is shown to him.

**8. Caregiver page**
- Shows how often the app is used, average session length, favourite subjects, the most engaging exercise types, spoken answers per session, how often sessions are finished, and returns after a break.

## Not included
- **Notifications:** they need a separate setup, so they can be a later step.
- **Exact time spent on each answer:** this would need a database change. Only total session time is used.

## Technical details
- Rules live in `builder.ts`, with a new `retention.ts` for preferences, spaced repetition, highlight and teaser. Everything is computed from existing `attempts`/`sessions` rows at session start.
- Series and collections are defined in `sequences.ts` (a `series` field and a `collections` list). "Explored" is worked out from completed sequence concepts.
- Spaced repetition picks earlier items with lower success, 2 or 7 days after they were last seen.
- The occasional choice depends on the day of the week and is stored per day (localStorage for guests).
- The caregiver metrics are local aggregations in `aidant.tsx`. No schema change unless one turns out to be needed.
- New sentences are recorded through the existing `voice-warm` route.
