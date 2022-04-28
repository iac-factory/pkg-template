# [`@iac-factory/pkg-template`](https://github.com/iac-factory/pkg-template) #
           
*Anything with a `ⓘ` is a dropdown containing
  additional, contextual information.* 

<br>
<details>
<summary>Usage & Security Disclaimer ⓘ</summary>

## Disclaimer ##

**CLI utilities can be incredibly dangerous.**

- `stdin`, `os.exec`, and shells are easy to interface and therefore exploit.
- Having the ability to issue `os.exec` or interface `stdin` always makes the
  application dangerous.
- Protecting against harmful bugs or malicious actors isn't difficult if
  the application's logic is handled correctly, and precautions are made
  to disable [`REPLs`](https://en.wikipedia.org/wiki/Read–eval–print_loop)
  (but allowing `SIGKILL`, `SIGSTOP`, and other user-controlled signals).

A language's packaging utility (`npx`, `pep`, `cargo`, etc.) extends amazing capabilities,
but should never have the opportunity to be taken advantage of (***Development Supply-Chain Attacks***).

Ensure due diligence in writing cli applications.

</details>

## Setup (Local Development) ##

```shell
# --> (1) Clone the repository
# --> (2) Change into the local clone's directory

cd "$(git rev-parse --show-toplevel)" && npm install
```

## Usage(s) ##

For any given command, issue `npx @iac-factory/[package-name] --help` for usage-related details.

| Command                                   | Description | Reference                 |
|-------------------------------------------|-------------|---------------------------|
| `npx @scope/example ? [--flags] {string}` | [...]       | [Package](./packages/...) |
|                                           |             |                           |

- See the [*References*](#references) section for local package-related management.

### `.npmrc` ###

**The following section is required**.

```ini
; GitHub `npm` Configuration for the `@iac-factory` Scope
@iac-factory
:registry = https://npm.pkg.github.com

; Scope Authentication - See EOF (1) Reference 
//npm.pkg.github.com/:_authToken=[TOKEN]

# /// (1) https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
```

<details>
<summary>Advanced Configuration ⓘ</summary>

### `~/.npmrc` ###

```ini
; For reference, every programming language's package-manager
; has a similar *.*rc (dot-rc) related setup (few exceptions
; include Go, C, etc.)

;
; Defaults := $ npm config ls --list
;          -> $ npm config ls --json

fund = false
cache = ~/.npm
prefix = /usr/local
package-lock = true
engine-strict = false

# --> loglevel = debug

registry = https://registry.npmjs.org/

; Package Initialization

; Personal Preference
init.author.email = jacob.sanders@cloudhybrid.io
init.author.name = Jacob B. Sanders
init.author.url = https://github.com/iac-factory
init.license = BSD-2-Clause
init.version = 0.0.1

; @cloud-technology:registry=https://gitlab.cloud-technology.io/api/v4/packages/npm/
; @iac-factory:registry=https://gitlab.cloud-technology.io/api/v4/packages/npm/

bin-links = true

; GitHub `npm` Configuration for the `@cloud-technology` Scope
@cloud-technology:registry = https://npm.pkg.github.com

; GitHub `npm` Configuration for the `@iac-factory` Scope
@iac-factory:registry = https://npm.pkg.github.com

; Scope Authentication - See EOF (1) Reference
; //npm.pkg.github.com/:_authToken=[TOKEN]

# /// (1) https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
```

</details>

## References ##

Regardless of involvements with the project, please acknowledge
the following philosophies:

- [**Versioning**](https://semver.org) is not an arbitrarily made up concept ([The 12-Factor Application](https://12factor.net/build-release-run)).
- For better or for worse, it's never okay to affect others without communication.
- *[Documentation](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/4/html/introduction_to_system_administration/s1-philosophy-document)* is no different than code.

<details>
<summary>Creating a New Package ⓘ</summary>

1. Ensure the package is not relating to any Front-End framework (`react`, `preact`, `vue` `svelte`).
2. Validate the package is hoistable.
    - If point (1) is true, it's likely for the following point (2) to also be safe.
        - https://github.com/lerna/lerna/blob/main/doc/hoist.md
3. Ensure the package will not affect the `nodejs` import system.
    - While it's *almost always* safe to assume that point (3) is true if points (1, 2) are true, it's generally
      worth noting. Refer to the dropdown immediately below (**Module Algorithm**) if interested in how one would go about confirming.

<details>

<summary>Module Algorithm ⓘ</summary>

Node.js's import system (generally like other runtime languages) makes use
of the following algorithm:

```txt
require(X) from module at path Y
1. If X is a core module,
   a. return the core module
   b. STOP
2. If X begins with '/'
   a. set Y to be the filesystem root
3. If X begins with './' or '/' or '../'
   a. LOAD_AS_FILE(Y + X)
   b. LOAD_AS_DIRECTORY(Y + X)
   c. THROW "not found"
4. If X begins with '#'
   a. LOAD_PACKAGE_IMPORTS(X, dirname(Y))
5. LOAD_PACKAGE_SELF(X, dirname(Y))
6. LOAD_NODE_MODULES(X, dirname(Y))
7. THROW "not found"

LOAD_AS_FILE(X)
1. If X is a file, load X as its file extension format. STOP
2. If X.js is a file, load X.js as JavaScript text. STOP
3. If X.json is a file, parse X.json to a JavaScript Object. STOP
4. If X.node is a file, load X.node as binary addon. STOP

LOAD_INDEX(X)
1. If X/index.js is a file, load X/index.js as JavaScript text. STOP
2. If X/index.json is a file, parse X/index.json to a JavaScript object. STOP
3. If X/index.node is a file, load X/index.node as binary addon. STOP

LOAD_AS_DIRECTORY(X)
1. If X/package.json is a file,
   a. Parse X/package.json, and look for "main" field.
   b. If "main" is a falsy value, GOTO 2.
   c. let M = X + (json main field)
   d. LOAD_AS_FILE(M)
   e. LOAD_INDEX(M)
   f. LOAD_INDEX(X) DEPRECATED
   g. THROW "not found"
2. LOAD_INDEX(X)

LOAD_NODE_MODULES(X, START)
1. let DIRS = NODE_MODULES_PATHS(START)
2. for each DIR in DIRS:
   a. LOAD_PACKAGE_EXPORTS(X, DIR)
   b. LOAD_AS_FILE(DIR/X)
   c. LOAD_AS_DIRECTORY(DIR/X)

NODE_MODULES_PATHS(START)
1. let PARTS = path split(START)
2. let I = count of PARTS - 1
3. let DIRS = []
4. while I >= 0,
   a. if PARTS[I] = "node_modules" CONTINUE
   b. DIR = path join(PARTS[0 .. I] + "node_modules")
   c. DIRS = DIR + DIRS
   d. let I = I - 1
5. return DIRS + GLOBAL_FOLDERS

LOAD_PACKAGE_IMPORTS(X, DIR)
1. Find the closest package scope SCOPE to DIR.
2. If no scope was found, return.
3. If the SCOPE/package.json "imports" is null or undefined, return.
4. let MATCH = PACKAGE_IMPORTS_RESOLVE(X, pathToFileURL(SCOPE),
  ["node", "require"]) defined in the ESM resolver.
5. RESOLVE_ESM_MATCH(MATCH).

LOAD_PACKAGE_EXPORTS(X, DIR)
1. Try to interpret X as a combination of NAME and SUBPATH where the name
   may have a @scope/ prefix and the subpath begins with a slash (`/`).
2. If X does not match this pattern or DIR/NAME/package.json is not a file,
   return.
3. Parse DIR/NAME/package.json, and look for "exports" field.
4. If "exports" is null or undefined, return.
5. let MATCH = PACKAGE_EXPORTS_RESOLVE(pathToFileURL(DIR/NAME), "." + SUBPATH,
   `package.json` "exports", ["node", "require"]) defined in the ESM resolver.
6. RESOLVE_ESM_MATCH(MATCH)

LOAD_PACKAGE_SELF(X, DIR)
1. Find the closest package scope SCOPE to DIR.
2. If no scope was found, return.
3. If the SCOPE/package.json "exports" is null or undefined, return.
4. If the SCOPE/package.json "name" is not the first segment of X, return.
5. let MATCH = PACKAGE_EXPORTS_RESOLVE(pathToFileURL(SCOPE),
   "." + X.slice("name".length), `package.json` "exports", ["node", "require"])
   defined in the ESM resolver.
6. RESOLVE_ESM_MATCH(MATCH)

RESOLVE_ESM_MATCH(MATCH)
1. let { RESOLVED, EXACT } = MATCH
2. let RESOLVED_PATH = fileURLToPath(RESOLVED)
3. If EXACT is true,
   a. If the file at RESOLVED_PATH exists, load RESOLVED_PATH as its extension
      format. STOP
4. Otherwise, if EXACT is false,
   a. LOAD_AS_FILE(RESOLVED_PATH)
   b. LOAD_AS_DIRECTORY(RESOLVED_PATH)
5. THROW "not found"
```

</details>

</details>

<details>
<summary>Releasing & Deployments ⓘ</summary>
<br/>

A "Release" will and always will be different in semantics as it relates to
a "Deployment" -- those differences are beyond scope, however.

### Release Management ###

In order to release a new version(s) of applicable packages,

```shell
cd "$(git rev-parse --show-toplevel)" && npm publish
```

A series of prompts will follow if applicable to candidate.

### Deployment ###

- Please see the [`ci` directory for details](./ci). 

</details>

<details>
<summary>Package Naming ⓘ</summary>

### Notice ###

Located in the [`./packages`](./packages) folder, there contains various
`npm` packages. Each package ***directory-name*** is named differently than its `npm`
counterpart, intentionally. Such keeps context clear when referring to either the
`npm` package vs. the source directory.

</details>

<details>
<summary>Motivation & Purpose ⓘ</summary>

[Under Review]

</details>
