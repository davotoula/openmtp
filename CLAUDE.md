# OpenMTP — Claude Code Guide

## Project Overview

OpenMTP is a **macOS-only** Electron 18 + React 17 application for transferring files between macOS and Android/MTP devices via USB. It presents a split-pane file explorer — one pane for the local Mac filesystem, one for the connected device.

Tech stack: Electron 18, React 17, Redux (+ redux-thunk), Material-UI v4, Webpack 5, Babel, ESLint (Airbnb + Prettier), SCSS.

Package manager: **yarn only** (not npm). Node 20 required.

---

## Process Architecture

Electron runs two processes. Understanding this boundary prevents bugs.

**Main process** (`app/main.dev.js` / `app/main.prod.js`)

- Runs Node.js. Owns device I/O, USB detection, app menus, windows, and the MTP kernel (kalam/legacy via native FFI in `ffi/`).
- Helpers that belong here live in `app/helpers/`.

**Renderer process** (the React app — everything under `app/containers/` and `app/components/`)

- Browser-like environment. Cannot import Electron or Node.js APIs directly.
- Communicates with main via IPC events (`app/services/ipc-events/`) or `@electron/remote`.

**Rule:** For UI work, stay in `app/containers/` and `app/components/`. Don't touch `app/helpers/`, `app/data/`, or `ffi/` unless you need to wire a new IPC call.

---

## Directory Map

```
app/
  containers/     # Pages/routes — each owns a Redux slice
  components/     # Shared UI components (no Redux connection)
  enums/          # All constants and enum objects — use these, never hardcode strings
  constants/      # env.js, paths.js, meta.js, keymaps.js
  store/          # Redux store setup (dev + prod configs)
  styles/
    js/           # JS theme variables and mixins (imported by withStyles)
    scss/         # Global SCSS (app.global.scss, base/, themes/)
  utils/          # Pure utility functions (funcs.js, log.js, checkIf.js, etc.)
  services/       # Analytics, IPC event types, Sentry
  helpers/        # Electron main-process helpers — avoid in renderer
  data/           # Controller → Repository → DataSource (MTP/local I/O) — avoid in renderer
```

---

## Redux Conventions

Each container owns its own Redux slice. Files follow this exact pattern:

```
app/containers/MyFeature/
  actions.js      # Action type constants + action creators + thunks
  reducers.js     # initialState + reducer function
  selectors.js    # reselect selectors, named make*
  index.jsx       # Component connected to Redux
```

**Action types** are prefixed using `reducerPrefixer`:

```js
import prefixer from '../../helpers/reducerPrefixer';
const prefix = '@@MyFeature';
export const actionTypes = prefixer(prefix, ['DO_THING', 'SET_VALUE']);
```

**Selectors** use `reselect` with `make*` naming:

```js
import { createSelector } from 'reselect';
const make = (state) => state.MyFeature;
export const makeMyValue = createSelector(
  make,
  (s) => s?.myValue ?? initialState.myValue
);
```

**Connecting to Redux:**

```js
const mapStateToProps = (state) => ({
  myValue: makeMyValue(state),
});
const mapDispatchToProps = (dispatch) =>
  bindActionCreators({ doThing }, dispatch);
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withStyles(styles)(MyComponent));
```

Async actions are thunks that call `fileExplorerController` (for file ops) and dispatch results back. See `app/containers/HomePage/actions.js` for examples.

---

## Component Patterns

**Class components** — the codebase uses `PureComponent`, not functional components with hooks. Match this style when adding to existing containers.

**Styling** — use Material-UI v4's `withStyles` HOC with JSS style objects. Not CSS modules, not styled-components (installed but unused for components).

```js
import { withStyles } from '@material-ui/core/styles';

const styles = (_theme) => ({
  root: { display: 'flex' },
  active: { color: 'red' },
});

class MyComponent extends PureComponent { ... }
export default withStyles(styles)(MyComponent);
```

Access styles as `this.props.classes` (conventionally aliased to `styles` in destructuring):

```js
const { classes: styles } = this.props;
```

**Conditional classes** — use the `classnames` package:

```js
import classnames from 'classnames';
<div className={classnames(styles.root, { [styles.active]: isActive })} />;
```

**Device type** — almost all device-specific logic is keyed by `DEVICE_TYPE`:

```js
import { DEVICE_TYPE } from '../../enums';
// DEVICE_TYPE.local  →  Mac filesystem pane
// DEVICE_TYPE.mtp    →  Android device pane
```

**Icons** — Font Awesome via `@fortawesome/react-fontawesome`. MUI icons also available.

---

## Dev Commands

```bash
yarn dev                        # Start dev server with hot reload
yarn build                      # Lint + build main + renderer (production)
yarn build-no-verify            # Build without lint gate
yarn lint                       # Run ESLint (Airbnb + Prettier)
yarn lint-fix                   # Auto-fix lint issues
yarn lint-styles                # Lint SCSS files
```

`yarn lint` runs automatically before every production build. Fix all lint errors before committing.

---

## Key Conventions & Gotchas

- **Use `checkIf()` for runtime assertions** on function arguments (`app/utils/checkIf.js`). It throws in dev, is a no-op in prod.

  ```js
  checkIf(deviceType, 'inObjectValues', DEVICE_TYPE);
  ```

- **Never hardcode strings for enums or paths.** Use `app/enums/` for device types, MTP modes, view types, etc. Use `app/constants/paths.js` for filesystem paths and `app/constants/meta.js` for app name/version.

- **No `console.log`.** Use `log()` from `app/utils/log.js` — it writes to the rotating log file and respects dev/prod modes.

- **No test suite.** Verify by running `yarn dev` and exercising the feature. Always run `yarn lint` before finishing.

- **MTP modes.** The device can be in `MTP_MODE.kalam` (fast, native) or `MTP_MODE.legacy`. UI that differs between modes should check `mtpMode` from the Settings selectors (`makeMtpMode`).

- **Settings state** lives in `app/containers/Settings/` and is persisted to disk. When adding a new user preference, wire it there.

- **Routing** uses React Router v5. Routes are defined in `app/routing/`. New pages get a container under `app/containers/` and a route entry.
