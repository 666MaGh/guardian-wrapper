# GitHub publication plan

Publication target: [666MaGh/guardian-wrapper](https://github.com/666MaGh/guardian-wrapper), authorized by the owner. Versions 0.1.0 and 0.2.0 are prereleases; full interactive semantic migration acceptance remains pending. This document records the repeatable publication procedure; VALIDATION.md and the release page carry observed results. GitHub publication and npm registry publication are separate: no npm registry publication is included here.

## 1. Prepare the public tree

Already present: README usage/purpose, architecture, full dependency/skill inventory, MIT license, upstream notices/source hashes, strict types, integration tests and CI configuration. Guardian provenance is recorded as the user's supplied Claude/Codex chat output; that original conversation has not been independently inspected. ADHD is a local snapshot with no invented upstream commit.

Before first push:

- Confirm owner/name and package identity. Add repository, homepage and bugs URLs to package.json only after the canonical URL is known; synchronize lockfiles.
- Inspect the exact publish set for private paths, credentials, app-specific facts and unintended Git metadata. Publish source/docs/assets and locks; exclude node_modules, local graft/runtime data, dist and artifacts from Git. Release artifacts are attached separately.
- Run npm ci, npm test, npm run typecheck, npm run check:assets, Bash syntax, npm audit in both the root and runtime/, and npm pack. Inspect packed inventory and test a clean tarball consumer. Resolve failures; investigate advisories, document unpatched dependency risks and avoid automatic broad fixes. A prerelease with a disclosed upstream issue does not imply an advisory-free stable release.
- Complete fresh-host acceptance checks or label the release a prerelease with the exact remaining verification boundary. No model/session pass is inferred from file checks.

Done when: the reviewed tree and release files match the documented claims and license/source records; local checks are green; missing platform/host evidence is explicit.

## 2. Create the repository and push source

Use an empty public repository because this checkout already contains README/LICENSE. GitHub documents both owner/visibility selection and CLI creation in [Creating a new repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository).

These are commands for the publication step, not commands that have been executed:

```sh
# Set to the agreed canonical owner and name.
repo_slug='666MaGh/guardian-wrapper'

git add .github .gitignore AGENTS.md CLAUDE.md LICENSE README.md THIRD-PARTY-NOTICES.md VALIDATION.md CONTRIBUTING.md SECURITY.md RELEASE-NOTES.md docs assets src test scripts runtime/package.json runtime/npm-shrinkwrap.json package.json package-lock.json npm-shrinkwrap.json sources.lock.json tsconfig.json
git diff --cached --check
git diff --cached --stat
# Review the staged content before the initial commit.
git commit -m 'Initial Guardian Wrapper 0.1.0'
gh repo create "$repo_slug" --public --source=. --remote=origin --push
```

Do not create a second remote/repository if origin already exists; verify the actual destination first. No credentials belong in remote URLs or published reports.

Done when: the canonical public URL shows the intended initial commit, documents render and the remote points to that repository.

## 3. Verify CI and repository settings

The workflow targets macOS/Linux and Node 22/24, including installing fswatch so the real watcher integration test is not skipped. Wait for all four jobs and investigate failures. Local Node 26/macOS results do not substitute for these runs.

Configure a main branch ruleset requiring a pull request and the passing verification jobs before ordinary merges; verify the settings are actually effective. Configure GitHub Issues and use bug/report discussions to gather reproduction details. Run the chosen secret/dependency scanning setup and inspect results. CI existence alone does not enable branch enforcement.

Done when: all matrix jobs pass, required status names match real jobs, rules/settings are visible and a new checkout can follow the README.

## 4. Build and publish a tagged release

Regenerate all release artifacts from the reviewed commit. Build the npm tarball and fresh Claude export, validate plugin, create a plugin archive, generate SHA256SUMS, and test the tarball in a separate npm consumer. Include sanitized validation results and clear compatibility/experimental notes.

```sh
# From the clean, verified publication commit.
git tag -a v0.2.0 -m 'Guardian Wrapper 0.2.0'
git push origin v0.2.0
gh release create v0.2.0 --verify-tag --draft --prerelease --title 'Guardian Wrapper 0.2.0' --notes-file RELEASE-NOTES.md
gh release upload v0.2.0 artifacts/release-0.2.0/guardian-context-wrapper-0.2.0.tgz artifacts/release-0.2.0/guardian-plugin-0.2.0.zip artifacts/release-0.2.0/SHA256SUMS
```

Write RELEASE-NOTES.md from final verified scope before running these commands. If host acceptance remains pending, mark the release as a prerelease and say which paths are unverified. Review the draft's asset names/checksums, version, instructions and claims; publish it only when the agreed gates are met. GitHub also automatically attaches source snapshots for the release tag. See [Managing releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository).

Done when: published tag matches the tested commit, assets/checksums match and an external user can download, install and initialize a disposable project.

## 5. Maintain the distribution

Use reviewed pull requests for code/upstream changes. Update sources.lock.json and all licenses/asset hashes deliberately, synchronize the root npm locks and reviewed runtime shrinkwrap, rerun integrity/tests/host checks for affected behavior, and publish a new version instead of changing a released snapshot. Keep release notes and compatibility evidence current. npm registry publication can follow later after name/account/provenance and trusted publishing are separately configured.
