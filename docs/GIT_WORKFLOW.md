# Running this as four GitHub accounts

Everything below is done once, on Day 1, by the repo owner unless marked otherwise.

## 1. Create the repo and add the other three

```bash
# Owner, on their machine:
cd farm-simulator
git init -b main
git add .
git commit -m "chore: scaffold monorepo, engine contract, api, pwa shell"
gh repo create farm-simulator --private --source=. --push
```

Add collaborators (Settings → Collaborators → Add people), or:

```bash
gh api -X PUT repos/OWNER/farm-simulator/collaborators/MEMBER_B -f permission=push
gh api -X PUT repos/OWNER/farm-simulator/collaborators/MEMBER_C -f permission=push
gh api -X PUT repos/OWNER/farm-simulator/collaborators/MEMBER_D -f permission=push
```

Each of the other three then runs:

```bash
gh auth login                  # each on their OWN account
git clone https://github.com/OWNER/farm-simulator.git
cd farm-simulator && npm install
git config user.name  "Their Name"
git config user.email "the-email-on-their-github-account"   # ← commits will not
                                                            #   be attributed without this
```

That email line is the single most common way teams lose marks: commits pushed
with the wrong email show as an unlinked author and their contribution graph
stays empty.

## 2. Protect `main`

Settings → Branches → Add branch protection rule for `main`:

- Require a pull request before merging — **1 approval**
- Dismiss stale approvals when new commits are pushed
- Require status checks to pass → select `verify`
- Require review from Code Owners
- Do not allow bypassing the above settings (tick it for yourself too)

Now nobody, including the owner, can push straight to `main`. Every change is a
reviewed PR, and the history shows it.

## 3. Fill in CODEOWNERS

Edit `.github/CODEOWNERS` and replace `@member-a` … `@member-d` with the real
usernames. Commit it through a PR like everything else.

## 4. Create the board and the issues

```bash
gh project create --owner OWNER --title "Farm Simulator"
# then, one per task:
gh issue create --title "engine: replace placeholder yields with district figures" \
  --body "Source: State Dept. of Agriculture. Update model.json and cite in _sources." \
  --label engine --assignee member-a
```

Make roughly six issues per person up front. Judges look at whether work was
planned or improvised.

## 5. The daily loop, for every member

```bash
git checkout main && git pull
git checkout -b feat/engine-monte-carlo         # area/short-description
# ...work...
npm test
git commit -m "feat(engine): add seeded Monte Carlo profit distribution"
git push -u origin feat/engine-monte-carlo
gh pr create --fill --assignee @me
```

Then: **someone else reviews and merges it.** Nobody merges their own PR.

Commit prefixes: `feat:` `fix:` `test:` `docs:` `refactor:` `chore:`, with the
module in brackets. `git log --oneline` then reads as a changelog you can paste
straight into the report.

## 6. Avoiding merge pain

The folder split exists so that four people almost never touch the same file:

```
packages/engine/     A
apps/web/src/ui/     B
apps/web/src/compare/ C
apps/web/src/platform/ + apps/api/  D
```

The exceptions are `types.ts` and `model.json`, which is exactly why CODEOWNERS
requires more than one approval on them. If you need a contract change, open
that PR first, get it merged, and let everyone rebase before you build on it.

## 7. Deploy

```bash
# Web (static) → any host. Vercel:
vercel --prod
# API → Render / Railway / Fly, start command: npm start --workspace=apps/api
```

Put `VITE_API_URL` in the web project's env, and set the API's CORS origin to
the deployed web URL. Have a live link by Day 3 — it removes all demo-day risk.

## 8. What a judge will look at

- Contributors graph: four columns of roughly similar height
- Closed PRs: each authored by one person and approved by another
- Issues: closed with linked PRs, not deleted
- `DECISIONS.md`: evidence the team argued about things
- CI badge in the README: green

Five minutes of setup here is worth more than a day of extra features.
