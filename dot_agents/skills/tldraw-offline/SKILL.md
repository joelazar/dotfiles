---
name: tldraw-offline
description: Operate the user's tldraw offline canvas app, including open .tldraw or .tldr files. Use whenever a task involves inspecting, editing, arranging, connecting, linting, or scripting a tldraw Desktop canvas.
---
<!-- installed-by:tldraw-desktop-agent-skills -->

# tldraw canvas operator

Use this skill for tasks involving open tldraw Desktop files. The desktop app exposes a local HTTP server that can list documents, inspect canvas state, capture screenshots, execute JavaScript against a live editor, and expose live script files for durable behavior.

## Server

The default server is `http://localhost:7236`. If that port is not active, read the `port` from `/Users/joelazar/Library/Application Support/tldraw/server.json`.

A clean quit removes `server.json`; the next launch rewrites it. It also records `pid` and `startedAt`, so if the file is present but requests to its `port` fail, treat it as stale (the app quit uncleanly) — the app is not running.

Every request except `GET /` and `/readme` needs the per-launch `token` from that same `server.json`, sent as `-H "authorization: Bearer <token>"`.

**If the server's base URL and bearer token are already in your context** — the app injects them at subagent launch when its agent hook is installed — use those literal values directly, or just call the installed `tq` helper (below). The rest of this section is the fallback for when neither is in hand.

**Each Bash tool call runs in a fresh shell — exported env vars do NOT persist between calls.** A `TLDRAW_TOKEN` you `export` in one call is empty in the next, so the request sends `authorization: Bearer` with no token and 401s. "Export once and reuse" does not work here — re-establish the port and token on every call. Read them together at the top of each call (both stay fixed for the app's lifetime, so re-reading is cheap):

```bash
PORT=$(jq -r .port '/Users/joelazar/Library/Application Support/tldraw/server.json'); TOKEN=$(jq -r .token '/Users/joelazar/Library/Application Support/tldraw/server.json')
# use as:  http://localhost:$PORT/...   -H "authorization: Bearer $TOKEN"
```

### Helper: `tq`

A ready-made helper ships with this skill at `"$HOME/skills/tldraw-offline/tq"`. Invoke it as `sh "$HOME/skills/tldraw-offline/tq" <METHOD> <path> [body]` — it re-reads the port and token from `server.json` itself on every call, so you never handle the token or the fresh-shell env problem. A body starting with `{` is sent as JSON; anything else as raw `text/plain`:

```bash
sh "$HOME/skills/tldraw-offline/tq" POST /api/search '{"code":"return await api.getDocs()"}'
sh "$HOME/skills/tldraw-offline/tq" POST /api/doc/DOC_ID/exec 'return editor.getCurrentPageShapes().length'
sh "$HOME/skills/tldraw-offline/tq" GET  /api/doc/DOC_ID/script-status
```

If `tq` is missing (an older install), fall back to raw `curl` with the `PORT`/`TOKEN` reads shown above. The raw-`curl` examples below stay in explicit form so each request is visible; translate any to `sh "$HOME/skills/tldraw-offline/tq" <METHOD> <path> [body]`.

```bash
curl -s http://localhost:7236/readme
```

## Core endpoints

- `POST /api/search`: run JavaScript with an `api` object. Use this to discover docs, read shapes and bindings, capture screenshots, and query the editor API reference.
- `POST /api/docs/create`: create a new named `.tldraw` file, open it in a new window, and save it to disk. Use this when the task needs a fresh document rather than an already-open one.
- `POST /api/doc/:id/exec`: run JavaScript with a live tldraw `editor` scoped to one document. Use this for canvas edits.
- `POST /api/doc/:id/script-workspace`: expose live script paths for direct durable document-script and asset edits.
- `GET /api/doc/:id/script-status`: inspect watcher state for `script/**` edits and find `errorLogPath`.

The code-taking POST endpoints accept raw JavaScript as the request body (`content-type: text/plain`) or a JSON body `{"code": "..."}`, and wrap the code in an async function so top-level `await` works. Prefer raw bodies for shell use.

## Use this first

Most tasks do not require searching `api.members`. Start with these calls and search the full Editor API only if a snippet fails or you truly need an unknown method. The object is `api`, not `spec`. Each block below is shown as raw `curl` so the request is visible; `sh "$HOME/skills/tldraw-offline/tq" <METHOD> <path> [body]` is the shorter equivalent that handles the port and token for you.

```bash
# Fresh shell per call: re-read port + token first (or use the values already in your context).
PORT=$(jq -r .port '/Users/joelazar/Library/Application Support/tldraw/server.json'); TOKEN=$(jq -r .token '/Users/joelazar/Library/Application Support/tldraw/server.json')

# Pick the target doc by focused window or filename.
curl -s -X POST http://localhost:$PORT/api/search \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"code":"return await api.getDocs({ name: \"NAME\" })"}'

# Read the current page's shapes with ids, bounds, text, and metadata.
curl -s -X POST http://localhost:$PORT/api/search \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"code":"const doc = await api.getFocusedDoc(); const page = doc ? await api.getShapes(doc.id) : null; return { doc, shapes: page?.shapes.map(s => ({ id: s.id, type: s.type, x: s.x, y: s.y, props: s.props, meta: s.meta })) ?? [] }"}'

# Read bindings only for connection-dependent behavior.
curl -s -X POST http://localhost:$PORT/api/search \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"code":"const doc = await api.getFocusedDoc(); return doc ? await api.getBindings(doc.id) : []"}'
```

## Creating documents

When the task needs a fresh document (not one of the open canvases), `POST /api/docs/create` with a JSON body `{"name": "..."}` creates `<name>.tldraw`, opens it in a new window, and saves it to disk immediately. The name takes a `.tldraw` extension or none — never legacy `.tldr`, which the app opens but does not create. Optional `"directory"` is an absolute path to an existing folder; the default is the user's Documents folder. It never overwrites — an existing file with that name is a `409`. The response returns the new doc's `id`, `documentId`, `filePath`, `name`, and `windowId` — use that `id` directly with `/api/doc/:id/exec` and the `api.*` reads, no `api.getDocs()` re-discovery needed. Do not create the file yourself with filesystem tools.

```bash
curl -s -X POST http://localhost:$PORT/api/docs/create \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"name":"Project Plan"}'
```

## Reference recipes

`api.recipes` (via `/api/search`) is an object keyed by recipe `id`; read one in full with `api.recipes['<id>']`. Query it when a task matches one of the worked recipes:

- `stack-existing-boxes` — Stack existing boxes
- `add-durable-behavior-with-a-document-script` — Add durable behavior with a document script
- `editable-furniture-with-anchored-internals` — Editable furniture with anchored internals
- `clickable-card-or-button-ui` — Clickable card or button UI
- `connection-dependent-behavior` — Connection-dependent behavior
- `animation-simulation-loop` — Animation / simulation loop
- `custom-shape-config-js` — Custom shape (config.js)
- `custom-binding-config-js` — Custom binding (config.js)
- `custom-overlay-config-js` — Custom overlay (config.js)

Fetch `/readme` when an endpoint fails or you need API details not covered here.

## Durable UI Behavior

For durable UI behavior, open `/script-workspace`, write `script/main.js`, check `script-status`, then verify behavior once. `script-status` returns a derived `state` field — treat `state: "applied"` as success; `"pending"` means the watcher hasn't applied the current file yet — poll again and it resolves (a file saved while the app was restarting is applied automatically the next time you open `/script-workspace` or read `script-status`, no manual re-save needed); `"error"` means the apply failed (read `lastApplyError` / `errorLogPath`). Branch on `state` rather than comparing the raw digests yourself. The `/script-workspace` response reports `isDefaultScript` (true while `script/main.js` is still the untouched starter template, pre-created when absent) — when `isDefaultScript` is false there is a preexisting script to extend, not clobber. Read `mainJsPath` to see the current contents before editing (and read it once first if your file tools refuse to write a file they have not read). Do not spend the run searching for pointer/click APIs — read the clickable-UI recipe from `api.recipes` first.

## Shape format

`api.getShapes()`, `/exec`, and document scripts all use raw tldraw SDK records. Create shapes with normal tldraw partials. Prefer importing primitives from `'tldraw'` when the host import map is active — in an `/exec` snippet use `await import('tldraw')` (a snippet can't use a static `import`); a document script can use a top-level `import { createShapeId } from 'tldraw'`. The `helpers` bag carries only editor-bound conveniences (not SDK primitives) — import primitives from `'tldraw'` directly. Read `api.imports` (from `/api/search`) for the full list of importable symbols:

```js
const { createShapeId, toRichText } = await import('tldraw')
editor.createShape({
	id: createShapeId('box1'),
	type: 'geo',
	x: 100,
	y: 100,
	props: { geo: 'rectangle', w: 300, h: 200, richText: toRichText('Label') },
})
await helpers.saveDoc()
```

Use `api.getShapes(doc.id)` to inspect existing raw shape records before mutating them.

## Screenshots

`api.getScreenshot(docId, opts?)` captures a JPEG to a temp file and returns `{ filePath, width, height, pageName, viewport, bounds, captureMode }` — a path, not image data, so open the file yourself to look at it. `opts.size` is `'small' | 'medium' | 'large' | 'full'` (default `'small'`). `opts.mode` is `'canvas'` (default — just the shapes, framed to their bounds) or `'window'` (the whole app window: canvas plus UI chrome); use `'window'` to see UI a script's `components` override draws outside the canvas. `opts.bounds` (`{ x, y, w, h }` in page coordinates) applies to `'canvas'` mode only. Prefer reading records with `api.getShapes()`; screenshot only when visual placement is uncertain or the user asks for visual proof.

## Diagram connections

- Create every meaningful connection with `helpers.createArrowBetweenShapes(fromId, toId, options)` so both endpoints have real bindings.
- Never create a raw arrow shape for a meaningful connection. Raw unbound arrows are only appropriate for explicitly decorative marks.
- Run `helpers.getLints()` before reporting a diagram complete and address every actionable result. Fetch `/readme` for the helper recipe and the opt-out for intentional decorative arrows.

## Workflow

1. Restate the intended outcome in concrete canvas terms.
2. Choose durability:
   - Static drawing edits such as moving, arranging, labeling, or styling shapes use `/exec`.
   - Durable behavior such as clickable UI, animations, reactive layouts, or "run on open" logic uses `/script-workspace` and direct filesystem edits under `script/**`. Read the worked recipes from `api.recipes` (via `/api/search`) before building durable behavior.
3. Verify once with records from `api.getShapes()`, `api.getBindings()`, `api.getScriptStatus()`, or a screenshot when visual placement is uncertain. Save the document with `helpers.saveDoc()` if you like.
4. Stop after one successful verification unless the user explicitly asks for debugging.

Never edit `.tldraw` archive files directly while they are open, and never edit `db.sqlite`, `db.sqlite-wal`, `db.sqlite-shm`, `metadata.json`, `.lock`, or `.script-workspace/**`.

## Recovering from a closed or unresponsive target document

If a request to your target `docId` comes back `"Window closed before responding"`, an error like `"Document not found"`, or times out with no response at all, that window is gone. Do not retry the same `docId`, and do not assume whatever `api.getDocs()` returns next is the same document — with more than one window open, the next call can silently resolve to a completely different, unrelated file.

- Call `api.getDocs()` fresh and match the result against the doc `name` (and `documentId` if you captured it) you were actually working on.
- **Name matches** → safe to resume against the new `id` for that doc.
- **No match, or `getDocs()` now returns only a document you never opened** → STOP. "The only open document" is not "the right document." Report that your target window closed and ask how to proceed instead of writing anywhere. If the task calls for a fresh document anyway, use `POST /api/docs/create` (above) rather than repurposing whatever `getDocs()` handed you.

Before any bulk or destructive edit (deleting all shapes on a page, clearing a doc to rebuild it), sanity-check what you are about to touch: read `api.getShapes(doc.id)` first and compare the shape count and content against what you expect on your own document. A nonzero shape count you did not create, or content unrelated to your task, means you are very likely on someone else's document — stop and report instead of deleting.

## Durable script pattern: editable furniture, anchored internals

Use this when a document script draws a board that users should rearrange or restyle while script-owned animation/game pieces still follow it.

- Create user-facing furniture with stable ids and `helpers.createShapeIfMissing` / `helpers.createShapesIfMissing`; never delete and redraw it on rerun.
- Pick one visible anchor per interactive system, such as a track or table felt.
- Use `helpers.onShapeTranslate(anchorId, ({ dx, dy }) => ... , { signal })` to respond only to that anchor.
- Move script-owned internals with `helpers.translateShapes(..., dx, dy)` (it runs without recording undo history); wrap other script-owned writes in `editor.run(fn, { history: 'ignore' })`.
- Avoid broad `store.listen` / `afterChange` layout handlers that react to every shape; they can treat the script's own writes as new user edits and recurse.

## Editor customization: custom shapes, tools, and overlays (`config.js`)

Custom shape types, tools, overlays, or UI components need a `script/config.js` next to `main.js` (create it through `/script-workspace`, same as `main.js`) — a `main.js`-only script cannot register them. Its default export runs BEFORE the editor mounts, receives `{ config }` (the app's default `TldrawConfig`), and returns it after mutating or spreading it. The passed `config` carries `shapeUtils`, `bindingUtils`, `assetUtils`, `overlayUtils`, `tools` (arrays of constructors), `components` (a `TLComponents` map), and `options`; optional `getShapeVisibility(shape, editor)`, `assetUrls`, and `initialState`. Push your constructors onto the arrays — a util/tool whose static `type`/`id` matches a stock one replaces it. Custom shapes subclass `ShapeUtil` and custom overlays subclass `OverlayUtil` (both from `'tldraw'`); define them in a sibling file and `import` them, since `config.js` and `main.js` are separate module graphs.

Read the worked `custom-shape`, `custom-binding`, and `custom-overlay` recipes from `api.recipes` for the full `ShapeUtil` / `BindingUtil` / `OverlayUtil` skeletons before writing one. (Their lifecycle hooks — `onAfterChangeToShape`, `getGeometry`, `isActive`, … — are also indexed in `api.members`, tagged with an `owner`, so a name search finds them instead of only the SDK types.) Saving `config.js` (or a file it imports) rebuilds the store and editor — document, camera, and selection are preserved but undo history resets — whereas saving `main.js` never remounts. Keep run-on-mount logic in `main.js`; `config.js` only builds the config. Types live in `.script-workspace/script-context.d.ts` (`ConfigScriptContext`, `TldrawConfig`).

## Fast path for static edits

Shown as raw `curl`; `sh "$HOME/skills/tldraw-offline/tq" <METHOD> <path> [body]` is the shorter equivalent that handles the port and token for you.

```bash
# Fresh shell per call: re-read port + token (or use the values already in your context).
PORT=$(jq -r .port '/Users/joelazar/Library/Application Support/tldraw/server.json'); TOKEN=$(jq -r .token '/Users/joelazar/Library/Application Support/tldraw/server.json')

# Discover docs.
curl -s -X POST http://localhost:$PORT/api/search \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"code":"return await api.getDocs()"}'

# Read shapes for a doc.
curl -s -X POST http://localhost:$PORT/api/search \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"code":"const [doc] = await api.getDocs(); return await api.getShapes(doc.id)"}'

# Mutate and if you like, save, with /exec, then verify once with api.getShapes().
curl -s -X POST http://localhost:$PORT/api/doc/DOC_ID/exec \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"code":"const { createShapeId, toRichText } = await import(\"tldraw\"); const id = createShapeId(\"r1\"); editor.createShape({ id, type: \"geo\", x: 100, y: 100, props: { geo: \"rectangle\", w: 200, h: 100, richText: toRichText(\"Hello\") } }); await helpers.saveDoc(); return { created: [id] }"}'
```

## Reporting

Keep summaries tight. Include the doc id/name, changed shape ids or script path, and the one verification result. If something fails, quote the server error, digest mismatch, or the relevant `.script-workspace/error.log` line.
