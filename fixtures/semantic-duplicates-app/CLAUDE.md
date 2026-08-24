# CLAUDE.md

## Working agreements

This file mirrors the expectations in AGENTS.md, written for Claude's
conventions but describing the same working agreements the rest of the team
follows day to day, plus a handful that are specific to this section.

### Testing

Before committing, make sure every test in the suite passes on your
machine. If the suite is red, the change stays local — it does not go into
a commit, no matter how small the diff looks or how confident you feel.

### Commit messages

Commit messages should be specific enough that a reviewer understands the
change without opening the diff. "Fix bug" tells nobody anything useful;
"Fix off-by-one in pagination cursor" does, because it names the actual
defect instead of just describing that something was wrong.

### Pull requests

Large, sprawling pull requests are hard to review — split your work into
smaller chunks instead. A reviewer who has to hold ten files of context in
their head at once will miss things a smaller, focused diff would not have
let slip through.

### Destructive operations

Get confirmation before deleting files, dropping data, or rewriting
history. These are the changes you can't take back later, so a second set
of eyes matters more here than it does anywhere else in the codebase.

### Function shape

Avoid writing functions that try to handle more than one responsibility at
once. A function that validates input, calls the network, and formats the
result is really three functions wearing a single name, and each one
deserves to be tested on its own.

### Lint warnings

PRs with outstanding lint warnings should not be opened for review. Clean
the warnings up first, then ask people to spend their attention on the
actual change instead of on the noise around it.

### Async style

Prefer async/await over raw Promise chains in new code — it reads top to
bottom instead of nesting `.then()` callbacks inside one another, which
makes error handling easier to follow too.

### Don't reinvent existing helpers

Before writing a new validator, formatter, or retry wrapper, search the
repo for one that already does the job. Two implementations of the same
behavior are strictly worse than one — they drift apart over time and only
one of them ever gets the bug fixes.

### Naming

Prefer descriptive variable names over abbreviations. `userAccountBalance`
costs a few extra keystrokes; `uab` costs a reviewer several minutes trying
to remember what it meant three files ago.

### Testing style

New logic should ship with a unit test in the same pull request, not as a
follow-up. "I'll add tests later" tends to mean "never," and the behavior
ships unverified in the meantime.

### Review etiquette

Leave style nits as suggestions in comments rather than blocking requests.
Not every preference needs to gate a merge — save blocking feedback for
things that are actually wrong.

### Cleaning up branches

Once a pull request merges, its branch should go away too. A remote
cluttered with months-old dead branches makes it genuinely hard to tell
what work is still active.

### Responding to feedback

Try to address review comments within a day of them landing. An open PR
with unanswered feedback quietly blocks whoever is waiting on it, even when
nobody says so directly in the thread.

### Handling credentials

Never commit a credential of any kind, not even inside a comment meant to
be temporary. If one does slip into history, rotating it is mandatory —
removing the line in a later commit does not undo the exposure.

### Draft status

Keep a pull request in draft while you're still actively iterating, and
only switch it to ready for review once it's genuinely done. Marking an
unfinished PR as ready just puts unfinished work in someone else's queue.

### Reading logs before asking

Check the existing error message and logs before opening a question in
chat. Half the time the answer to "why is this failing" is already printed
right there, and searching for it first respects everyone's time.

### Rebasing before review

Rebase a feature branch onto the current default branch before asking for
review, so the diff a reviewer looks at is the diff that will actually
merge, not one that's already several commits behind.
