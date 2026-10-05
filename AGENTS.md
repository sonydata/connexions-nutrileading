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
- Adaptation is computed per skill from recent `attempts` outcomes at session start — local rules, never AI.
- Spoken answers use the free browser SpeechRecognition (fr-FR) as an indicative signal only, never a score; recordings stay in browser memory and are discarded after each exercise — no paid transcription, no upload.
- Oral rows in `attempts` reuse existing columns: `kind` = oral mode, `option_count` = approximate spoken word count, `concept` suffixed `#rep` when the model sentence was repeated — avoids a schema change.
- Choice photos are shown only when every option has one, and never for advice/action answers, so an image never contradicts the answer; otherwise a context photo from `SCENE` illustrates the situation, never the answer.
- Choice questions read the sentence, the question and every answer aloud; tapping an answer interrupts the reading.
- Discovery mode: /seance runs without an account — built locally, nothing saved, voice read from cache only (speakCached never synthesises) so visitors can't create paid calls.
