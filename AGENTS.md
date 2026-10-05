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
- Exercise photos come only from the curated library in `src/lib/library.ts`; the AI must reference those ids (validated server-side) — keeps sessions fast and cheap.
- Session generation, attempt logging and voice synthesis are authenticated server functions in `src/lib/session.functions.ts`; AI gateway calls live in `src/lib/gateway.server.ts` — keeps keys server-side.
- Adaptation is computed per skill from recent `attempts` outcomes (spontaneous / after_repeat / after_cue / revealed) at session start — no separate state to drift.
