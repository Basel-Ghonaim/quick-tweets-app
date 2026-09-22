# Finding 0037: Moving a finding breaks the links that reach it from outside the repository

> **Status:** Open
> **Date:** 2026-09-22
> **Affected areas:** [Documentation Strategy §9](../../documentation-strategy.md#9-architecture-findings-policy) (the rule that a finding moves when it closes); `docs/architecture/findings/`; links to findings from GitHub Issues and pull requests
> **Reported by:** Basel Ghonaim (surfaced by the independent review of the findings split, [#786](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/786))

## Observation

The findings register is filed by status, and the change that closes a finding moves it from `open/` to `resolved/` (§9). Inside the repository nothing breaks, because that change repoints every link to the finding. **Outside the repository, nothing can be repointed.** A link written into an Issue, a pull request or anywhere else as `blob/main/<path>` names a path, and GitHub resolves it against the current tree of `main`. Once the path is gone, the link answers `404`; GitHub does not follow a rename.

Checked on 2026-09-22:

- `docs/features/authentication.md` moved into a folder on 2026-08-20. Its `blob/main` URL now answers `404`, while the same path pinned to a commit that held it (`blob/71305c8b…`) answers `200`.
- 101 Issues and pull requests in this repository mention a finding's path in their body: 27 Issues and 74 pull requests, two of them still open. #786's own body links Finding 0034 through `blob/main/docs/architecture/findings/0034-…`. That link answers `200` today and stops resolving once the split merges, because 0034 is filed under `resolved/`.

The split turns an occasional cost into a recurring one: every finding that closes moves, so every closing breaks every link that reaches it from outside.

## Why it matters

Issues and pull requests are where findings are discussed and cited as evidence. A link that stops resolving leaves a reader of the tracker with a finding's number and no way to reach it except by searching. The repository's own answer to moved paths, [historical paths](../../historical-paths.md), serves documents in the tree, not the tracker.

## Why it is recorded rather than resolved

The cost was seen in the review of the split and deferred, and the split was kept with the move rule as it stands. Every available answer changes either how the project links to findings or where findings live, which is a decision rather than a correction:

- cite findings from outside the repository through commit-pinned links, which never break but show a finding as it stood rather than as it is;
- give each finding a path that never changes, which gives up filing by folder;
- keep one index at a fixed path for outside links to target;
- accept the breakage, and link the register rather than the finding.

## Not decided here

Which answer, if any · whether it applies to every document that moves, since the cost is not particular to findings and the same change also moved the authentication feature document · whether links already written into Issues and pull requests are repaired.
