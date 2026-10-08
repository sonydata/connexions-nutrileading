<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Session content comes from the local bank in `src/lib/content.ts`, assembled by rules in `src/lib/builder.ts` — no AI per session, to keep costs low and facts controlled.
- Exercise photos come only from the curated library in `src/lib/library.ts`.
- Visual hints pair an explicit semantic cue with a precise curated photo when available, shared by all response modes and revealed only on request; never substitute a generic image for a missing subject or change scoring.
- Spoken audio is synthesised once per sentence and cached in the private `voice` storage bucket — repeat plays cost nothing.
- Adaptation is computed per skill from recent evaluated `attempts` at session start. Knowledge turns (a choice question or a word to find) are saved with their exercise kind and a silent outcome: spontaneous, after_cue (with help or via choices), after_repeat (spoken but not recognised), revealed — never shown to the person. Opinion/repeat turns stay neutral `discussion:` rows, excluded from level and affinity inference.
- Every knowledge turn ends with the answer said aloud (confirmText / revealText in discussion.ts), never "wrong".
- "Accompagnement renforcé" (`params.reinforced`, from the caregiver profile, automatic when comprehension ≥ 4) shows the simple screen: big start button, picture + question, choices or hands-free listening that ends after a pause, answer said, automatic next turn. Caregiver controls (Réécouter, J'ai fini, Passer) stay small at the bottom.
- Date-based items (`datedReperes`) are built at session time, never at module load (the server clock reads 1970 at load). The Repères opening appears at most every 3 days, least-recently-seen items first. Never ask orientation questions (year, month, season, today's president).
- Spoken answers use the free browser SpeechRecognition (fr-FR) as an indicative signal only, never a score; recordings stay in browser memory and are discarded after each exercise — no paid transcription, no upload.
- Oral rows in `attempts` reuse existing columns: `kind` = oral mode, `option_count` = approximate spoken word count, `concept` suffixed `#rep` when the model sentence was repeated — avoids a schema change.
- Choice photos are shown only when every option has one, and never for advice/action answers, so an image never contradicts the answer; otherwise a context photo from `SCENE` illustrates the situation, never the answer.
- Guided sessions start directly in one blended flow, with optional response choices and opinion prompts; no mode selection is shown because it was confusing. Continuing never requires validation and speech is never evaluated.
- Response-mode instructions live in a shared browser-safe module used by the session and voice inventory; each prompt names one concrete action without numbered answer announcements.
- Discovery mode: /seance runs without an account — built locally, nothing saved.
- Voice: one natural voice, whole sentences only (never split into fragments). A missing clip is synthesised once and cached — only for sentences of the bank (`isVoiceText` in voice-texts.ts), for guests and accounts alike, so cost stays bounded. The device voice is a last resort only when synthesis fails; the caregiver's "Tester la voix" shows the reason.
- Every bank item has a subject (`topic`, explicit or derived by topicOf) separate from its skill; buildSession fills ~80 % of slots from the chosen interests (rotating subjects) and ~20 % from transversal "general" items — personalisation stays rule-based.
- First launch goes through /interets; signed-in choices are saved in caregiver_settings.topics ("i:" prefix), guest choices in localStorage.
- Sessions are built from thematic mini-sequences in `src/lib/sequences.ts` (Comprendre → Retrouver → S'exprimer → Reformuler on one subject), 3 per session + 1 time item — keeps choice questions ≈ a quarter and gives continuity; the old slot plan is only a fallback.
- Sessions are built by buildPlan in builder.ts: one familiar path (a series already begun, or a liked subject), one new path, a time item and one earlier word brought back with spacing (2 days if it gave trouble, else 7). Tastes come from attempt outcomes. Rules only, so retention costs nothing and stays predictable.
- Collections in sequences.ts are ordered and double as multi-day series. "Explored" means the path's "-c" step was answered, so no schema change is needed.
- Adaptation goes through `src/lib/adaptive-profile.ts` (`deriveParams`): caregiver functional profile (`adaptive_profiles.answers`) + recent `signal:*`/`discussion:*` rows → session params; language support and intellectual complexity stay separate — single, pure place to evolve the algorithm.
- Interaction signals (repeat, not understood, abandon) are `attempts` rows with `kind` = `signal:<name>`, excluded from levels/affinity and scores — no schema change, no audio stored.
