# AGENTS.md

## Guidance for AI agents working in this repo

These are working agreements for anyone — human or AI — making changes
here. They cover testing, review hygiene, and a few repo-specific
conventions worth knowing before you open a pull request.

### Tests before you commit

Run the full test suite before you commit anything. A change that hasn't
been run through `npm test` locally is not ready to land — CI catching it
first just burns a slower feedback loop for everyone involved. Even a
one-line typo fix needs a green run first, since typo fixes are exactly the
kind of change that quietly breaks a snapshot test.

### Commit messages

Write commit messages that clearly explain what changed and why. A reviewer
should be able to understand the intent of a change from the message alone,
without needing to open the diff first. "Update logic" is not a commit
message; "Fix pagination cursor off-by-one on the last page" is.

### Pull request size

Keep pull requests small and scoped to one change — avoid sprawling PRs that
bundle unrelated work together. Reviewers can give a focused 200-line diff a
careful read, but a 2000-line diff gets rubber-stamped instead. If a change
touches both the API and the UI, consider whether it can ship as two PRs.

### Destructive changes

Never perform a destructive operation without checking with someone first.
That covers deleting files, dropping database tables, force-pushing shared
branches, or anything else that can't be trivially undone once it lands.
When in doubt, treat the operation as destructive and ask first.

### Function size

Each function should do exactly one thing — split up anything that grew too
large to describe in a single sentence. If you find yourself writing "and"
in a function's name, that's usually a sign it needs to be two functions
instead of one doing double duty.

### Linting

Resolve every linter warning before you open a pull request. Warnings that
are allowed to pile up over time become noise nobody reads, which defeats
the point of having a linter in the first place. A PR that adds new
warnings should fix them, not just avoid adding more on top.

### Type safety

Prefer TypeScript strict mode for any new module — it catches a whole class
of bugs before they ever reach code review, which is cheaper for everyone
than finding the same bug in production later.

### Reuse existing helpers

Reuse the existing validator, formatter, and retry helpers instead of
writing a new one that does the same thing differently. If you find
yourself about to write another email check or another retry loop, search
the repo first — there's a good chance one already exists under `src/`.

### Dependency hygiene

Check the bundle-size impact before adding a new dependency. A small local
utility function is often cheaper, in every sense, than a package that
pulls in a dozen transitive dependencies for one helper.

### Error handling

Never swallow an error silently — log it or rethrow it. A `catch` block
that does nothing turns a debuggable failure into a mystery three weeks
later, when someone else hits it with no idea where to start looking.

### Documentation

Update the README's "Getting started" section whenever a setup step
changes. Instructions that drift out of sync with reality cost every new
contributor time figuring out what actually still works.

### Branch hygiene

Delete a branch once its pull request merges instead of leaving it around.
A remote full of stale branches makes it hard to tell what's actually still
in flight versus what finished weeks ago and was never cleaned up.

### Review turnaround

Respond to review comments within a day when you can. A pull request that
sits open for a week with unanswered feedback effectively blocks whoever
was waiting on it, even if nobody says so out loud.

### Secrets

Never commit an API key, password, or token, even in a comment or a
throwaway test fixture. Rotate it immediately if one slips through, and
don't assume a follow-up commit removing it is enough — the history still
has it.

### Draft vs ready

Open a pull request as a draft while you're still iterating, and mark it
ready for review only once it's actually done. Flipping a half-finished PR
to "ready" just so it shows up on someone's queue wastes their attention.
