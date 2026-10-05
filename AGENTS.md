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
- Spoken audio is synthesised once per sentence and cached in the private `voice` storage bucket — repeat plays cost nothing.
- Adaptation is computed per skill from recent `attempts` outcomes at session start; oral exercises are rated by the caregiver, never by AI.
