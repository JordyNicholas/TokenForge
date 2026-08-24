# GitHub Copilot instructions

## How to work in this repo

The same working agreements the rest of the team follows, written out here
for Copilot's context window, plus a few conventions specific to this repo.

- The full test suite must be green before any commit lands. Treat a
  failing local run as a blocker, not a formality you can skip under
  deadline pressure — deadlines are exactly when this matters most.
- Explain the "why" behind a change in the commit message, not just the
  "what" — the diff itself already shows what changed, so restating it in
  the message wastes the one place you get to explain intent.
- Small, single-purpose pull requests review faster and ship safer — keep
  them that way even when a change feels urgent and you're tempted to fold
  in "one more thing" while you're already in there.
- Anything irreversible — delete, drop, force-push — needs a heads-up
  before you do it, no matter how confident you are that it's fine this
  time.
- Functions should stay short and focused on one job. If a function needs a
  "part 1 / part 2" comment to explain itself, it needs to be split into
  two functions instead of one with a comment doing the splitting for it.
- No open lint warnings when a pull request goes up for review; resolve
  them before requesting eyes on the change, not while review is already
  underway.
- Keep environment variables documented in `.env.example` so a new
  contributor can get the app running without asking around in chat for
  the three variables nobody wrote down.
- Don't hardcode secrets or API keys in source files, even temporarily for
  local testing — they have a way of surviving into a commit.
- Every schema change needs a reversible migration, not just a forward one,
  so a bad deploy can actually be rolled back instead of hand-patched.
- New UI components need keyboard navigation support — don't ship an
  interactive element that only works with a mouse.
- Once a pull request merges, delete its branch. Leaving it around just
  adds one more stale entry someone has to mentally filter out later.
- A leaked credential must be rotated, full stop — removing it from the
  latest commit does not remove it from history, so rotation is the only
  fix that actually closes the exposure.
- Before asking a question in chat, check whether the terminal already
  printed the answer. Reading the error message first saves everyone a
  round trip.
- Check `src/` for an existing validator, formatter, or retry helper before
  adding a new one. If two functions end up doing the same thing in
  different ways, one of them should be deleted, not both kept around.
- Squash fixup commits before opening for review — bisecting a clean
  history is much easier than digging through a trail of "wip" commits.
- Prefer named exports over default exports so a rename doesn't silently
  break an import somewhere else in the codebase.
- Write a failing test for a bug before fixing it, so the test actually
  proves the regression is caught instead of just looking plausible.
- Run the type checker locally before pushing instead of waiting for CI to
  report the first type error back to you.
- Keep imports consistent: relative within a package, workspace-scoped
  across packages, never mixed together in the same file.
- Try to respond to review feedback within a day. An open PR with
  unanswered comments blocks whoever is waiting on it, even if nobody
  says so directly in the thread.
- Rebase onto the latest default branch before requesting review so the
  diff a reviewer sees is the diff that will actually land.
- Don't hand-commit generated files like build output or lockfiles — let
  CI regenerate them instead of committing a stale copy by hand.
- Keep unfinished work in draft status, and flip it to ready for review
  only once it's actually done — marking it ready too early just puts
  unfinished work in front of a reviewer before it's worth their time.
- Get at least one approval before merging your own pull request, even
  when the change feels obviously safe — that's exactly the kind of
  change that occasionally turns out not to be.
