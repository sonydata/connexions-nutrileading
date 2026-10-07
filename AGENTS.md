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
- Adaptation is computed per skill from recent evaluated legacy `attempts` at session start; discussion-prefixed participation rows are excluded from level and affinity inference to avoid interpreting speech as success or failure.
- Spoken answers use the free browser SpeechRecognition (fr-FR) as an indicative signal only, never a score; recordings stay in browser memory and are discarded after each exercise — no paid transcription, no upload.
- Oral rows in `attempts` reuse existing columns: `kind` = oral mode, `option_count` = approximate spoken word count, `concept` suffixed `#rep` when the model sentence was repeated — avoids a schema change.
- Choice photos are shown only when every option has one, and never for advice/action answers, so an image never contradicts the answer; otherwise a context photo from `SCENE` illustrates the situation, never the answer.
- Guided sessions use two local presentation modes: Conversation opens with information and a personal invitation; Votre regard opens with a question and optional pistes. All paths permit continuing without validation; speech is never evaluated.
- Response-mode instructions live in a shared browser-safe module used by the session and voice inventory; each prompt names one concrete action without numbered answer announcements.
- Discovery mode: /seance runs without an account — built locally, nothing saved, voice read from cache only (speakCached never synthesises) so visitors can't create paid calls.
- Every bank item has a subject (`topic`, explicit or derived by topicOf) separate from its skill; buildSession fills ~80 % of slots from the chosen interests (rotating subjects) and ~20 % from transversal "general" items — personalisation stays rule-based.
- First launch goes through /interets; signed-in choices are saved in caregiver_settings.topics ("i:" prefix), guest choices in localStorage.
- Sessions are built from thematic mini-sequences in `src/lib/sequences.ts` (Comprendre → Retrouver → S'exprimer → Reformuler on one subject), 3 per session + 1 time item — keeps choice questions ≈ a quarter and gives continuity; the old slot plan is only a fallback.
- Sessions are built by buildPlan in builder.ts: one familiar path (a series already begun, or a liked subject), one new path, a time item and one earlier word brought back with spacing (2 days if it gave trouble, else 7). Tastes come from attempt outcomes. Rules only, so retention costs nothing and stays predictable.
- Collections in sequences.ts are ordered and double as multi-day series. "Explored" means the path's "-c" step was answered, so no schema change is needed.
- Adaptation goes through `src/lib/adaptive-profile.ts` (`deriveParams`): caregiver functional profile (`adaptive_profiles.answers`) + recent `signal:*`/`discussion:*` rows → session params; language support and intellectual complexity stay separate — single, pure place to evolve the algorithm.
- Interaction signals (repeat, not understood, abandon) are `attempts` rows with `kind` = `signal:<name>`, excluded from levels/affinity and scores — no schema change, no audio stored.
