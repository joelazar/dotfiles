-- Rex config. Only non-default bindings are listed.
-- Docs: https://www.superlogical.com/rex/docs
--   All pages as markdown: curl -sL https://www.superlogical.com/rex/docs/llms.txt (links to *.md pages)
--   Grep all: curl -sL .../llms.txt | rg -o 'https://[^)]+\.md' | xargs -n1 curl -sL | perl -pe 's/<[^>]+>//g' > /tmp/rexdocs.md
--     then rg -i <term> /tmp/rexdocs.md (tags stripped; raw pages have long <span hidden> lines)
--   Bindable actions: rex actions, rex -C "<client label>" actions (labels: rex client ls)
--   API methods: rex api list, rex api describe <method>; keys: rex keymap; offline guide: rex __internal skill
-- Default shortcuts: command palette (cmd+shift+p) or "Change Shortcut…".
-- Check: rex config check   Reload: rex config reload (Rex doesn't watch this file)
-- Appearance, font and other app settings live in the app (see run_onchange_set-rex).

local terminal = "com.superlogical.terminal"

-- Resume pi after a server restart. pi >= 1.7 reports `pi --session <uuid>` over OSC 7577
-- (plus any restriction flags it was started with; each combination needs its own rule).
-- claude/codex/opencode rules are built in; drop this rule once `rex config check` lists
-- "pi (built in)".
-- Inspect: rex block call -b "$REX_BLOCK" program_resume_records; rex config check
rex.set("resume.trust.pi", {
  command = { "pi", "--session", rex.match.uuid },
})

-- Type raw bytes into the focused terminal.
rex.action({
  name = "send_text",
  title = "Send Text",
  category = "Terminal",
  args = { text = "string" },
  run = function(ctx, args)
    local _, err = rex.block.call(terminal, "write", { block_id = ctx.block_id, data = args.text })
    if err ~= nil then
      error(err, 0)
    end
  end,
})

-- New tab right after the active one (client.tab.new always appends).
-- The app's own new tab is the only reliable way to get it selected, so let the
-- app create it, and move it in a detached `rex do` helper: queued app actions
-- run after this returns, and the config has no rex.sleep/rex.after.
-- Moving a tab doesn't change which tab is selected.
local rex_bin = (
  os.getenv("REX_BIN_DIR")
  or (
    os.getenv("HOME")
    .. "/Library/Application Support/com.superlogical.rex/RexServer/Versions/Current/Rex Server.app/Contents/MacOS"
  )
) .. "/rex"

-- Waits (up to 3s) for a tab not in `known`, then moves it before `next`.
local move_new_tab = [[
local known = {}
for id in rex.args.known:gmatch("[^,]+") do known[id] = true end
for _ = 1, 60 do
  local v = rex.session.view({})
  for _, w in ipairs(v and v.windows or {}) do
    if not known[w.window_id] then
      return rex.session.move_window({ window_id = w.window_id, before_window_id = rex.args.next })
    end
  end
  rex.sleep(0.05)
end
error("new tab never appeared", 0)
]]

rex.action({
  name = "new_tab_adjacent",
  title = "New Tab Next to Current",
  category = "Window",
  run = function(ctx)
    local v, err = rex.session.view({})
    if v == nil then
      error(err, 0)
    end
    local known, next_id = {}, nil
    for i, w in ipairs(v.windows) do
      known[#known + 1] = w.window_id
      if w.window_id == v.active_window_id then
        next_id = v.windows[i + 1] and v.windows[i + 1].window_id
      end
    end
    if next_id then
      local _, serr = rex.exec.start({
        rex_bin,
        "do",
        "-s",
        v.session_id,
        "-e",
        move_new_tab,
        "known=" .. table.concat(known, ","),
        "next=" .. next_id,
      }, { detach = true, stdout = false, stderr = false })
      if serr ~= nil then
        error(serr, 0)
      end
    end
    rex.client.queue("client.tab.new")
  end,
})

-- Open the pane's scrollback, with colors, in nvim in place of that pane.
-- Pager: ~/.config/nvim/scrollback.lua (minimal nvim; y/gy copy, q quit, [[ ]] prompts, ]u [u <space>u URLs,
-- e full nvim, ctrl+h/j/k/l move between panes).
-- The pane is detached (keeps running) while the pager takes its slot, and put back when the pager exits.
local restore_pane = [[
rex.session.move_block({ block_id = rex.args.pane, anchor_block_id = rex.args.pager, side = "before" })
rex.session.focus_block({ block_id = rex.args.pane })
]]
local scrollback_script = [[
pane=$1 pager=$REX_BLOCK; export REX=$2 f=$4
trap '"$REX" do -e "$3" pane="$pane" pager="$pager"; rm -f "$f"' EXIT
nvim --clean -u ~/.config/nvim/scrollback.lua "$f"
[ $? -eq 3 ] && nvim + "$f"
]]
rex.action({
  name = "edit_scrollback",
  title = "Edit Scrollback",
  category = "Terminal",
  run = function(ctx)
    local pane = ctx.block_id
    -- capture before splitting: the split resizes the pane, and TUIs like pi clear scrollback on resize
    local args = { block_id = pane, format = "vt", trim = true, unwrap = true, max_bytes = 983040 }
    local r, cerr = rex.block.call(terminal, "format", args)
    if r == nil then
      error(cerr, 0)
    end
    local chunks = { r.content }
    local offset = #r.content
    while r.id ~= nil and not r.eof do
      r, cerr = rex.block.call(terminal, "blob_read", { block_id = pane, id = r.id, offset = offset })
      if r == nil then
        error(cerr, 0)
      end
      chunks[#chunks + 1] = r.data
      offset = offset + #r.data
    end
    local path = os.tmpname()
    local f = assert(io.open(path, "wb"))
    f:write(table.concat(chunks))
    f:close()
    local p = rex.block.call(terminal, "process", { block_id = pane })
    local s, err = rex.session.new_split({
      anchor_id = pane,
      direction = "horizontal",
      side = "after",
      focus = true,
      layout = rex.layout.block({
        flavor = "com.superlogical.terminal.shell",
        options = {
          command = { "sh", "-c", scrollback_script, "sh", pane, rex_bin, restore_pane, path },
          cwd = p and p.foreground and p.foreground.cwd,
        },
      }),
    })
    if s == nil then
      error(err, 0)
    end
    local _, derr = rex.session.detach_block({ block_id = pane })
    if derr ~= nil then
      error(derr, 0)
    end
    -- detaching moves focus to a neighbour; put it on the pager
    rex.session.focus_block({ block_id = s.block_ids[1] })
  end,
})

------------------------------------------------------------------------
-- Tabs
------------------------------------------------------------------------
-- physical digits: keeps cmd+1..9 working on non-US layouts
for i = 1, 8 do
  rex.bind("cmd+[Digit" .. i .. "]", "client.tab.goto", { index = i })
end
rex.bind("cmd+[Digit9]", "client.tab.goto", { index = -1 })
rex.bind("cmd+t", "new_tab_adjacent")
rex.bind("cmd+shift+t", "client.tab.rename")
rex.bind("cmd+shift+,", "client.tab.move.backward")
rex.bind("cmd+shift+.", "client.tab.move.forward")

-- Sidebar: focus the current session (no "current session only" setting exists).
-- Rex has no expand-all, so expand every session on this server.
rex.action({
  name = "expand_all_sessions",
  title = "Expand All Sessions",
  category = "Session",
  run = function()
    local r, err = rex.call("session.list")
    if r == nil then
      error(err, 0)
    end
    for _, s in ipairs(r.sessions or {}) do
      rex.client.queue("session.expand", { session_id = s.session_id })
    end
  end,
})
rex.bind("cmd+shift+o", "session.collapse_others")
rex.bind("cmd+alt+shift+o", "expand_all_sessions")

------------------------------------------------------------------------
-- Panes
------------------------------------------------------------------------
rex.bind("cmd+ctrl+h", "pane.focus.left")
rex.bind("cmd+ctrl+j", "pane.focus.down")
rex.bind("cmd+ctrl+k", "pane.focus.up")
rex.bind("cmd+ctrl+l", "pane.focus.right")

-- Scroll by half a page (cmd+pageup/pagedown: full page, cmd+home/end: top/bottom).
-- Negative counts scroll up.
-- Replaces Rex's default shift+cmd+up = Split Pane Up.
rex.bind("shift+cmd+up", "client.scroll.pages", { count = -0.5 })
rex.bind("shift+cmd+down", "client.scroll.pages", { count = 0.5 })
-- One line at a time. Replaces Rex's default cmd+up/down = Jump to Previous/Next Prompt.
rex.bind("cmd+up", "client.scroll.lines", { count = -1 })
rex.bind("cmd+down", "client.scroll.lines", { count = 1 })

-- resize mode: cmd+ctrl+r, then h/j/k/l; escape leaves
rex.mode("resize", { exclusive = true })
rex.bind("cmd+ctrl+r", "client.mode.enter", { name = "resize" })
rex.bind("resize/h", "pane.resize", { direction = "left" })
rex.bind("resize/j", "pane.resize", { direction = "down" })
rex.bind("resize/k", "pane.resize", { direction = "up" })
rex.bind("resize/l", "pane.resize", { direction = "right" })

-- smart-splits: ctrl+h/j/k/l moves between Rex panes, but passes the key
-- through when nvim is in the foreground (nvim moves out at its own edge, see
-- ~/Code/joelazar/smart-splits-rex.md). At the window edge the key is
-- swallowed, so ctrl+l never clears the shell by accident.
local function smart_nav(direction)
  return function(ctx)
    if ctx.block_id == nil then
      return false
    end
    local p = rex.block.call(terminal, "process", { block_id = ctx.block_id })
    local fg = p and p.foreground
    if fg and fg.name == "nvim" then
      return false
    end
    rex.session.focus_direction({ direction = direction })
    return true
  end
end

rex.bind("ctrl+h", smart_nav("left"))
rex.bind("ctrl+j", smart_nav("down"))
rex.bind("ctrl+k", smart_nav("up"))
rex.bind("ctrl+l", smart_nav("right"))

------------------------------------------------------------------------
-- Floats
------------------------------------------------------------------------
rex.bind("cmd+shift+f", "edit_scrollback")
-- Rex default, restated: copy mode (vim keys through scrollback)
rex.bind("cmd+shift+c", "pane.copy_mode.enter")

------------------------------------------------------------------------
-- Text sent to the shell / TUIs
------------------------------------------------------------------------
local sends = {
  -- home/end, not ctrl+a/ctrl+e
  ["cmd+left"] = "\27[H",
  ["cmd+right"] = "\27[F",
  ["shift+enter"] = "\27[13;2u",
  ["ctrl+enter"] = "\27[13;5u",
  -- cmd+p -> ctrl+p
  ["cmd+p"] = "\16",
  -- cmd+r -> <D-r> for nvim (CSI u: 114='r', 9=1+super)
  ["cmd+r"] = "\27[114;9u",
  -- cmd+shift+<x> -> ctrl+shift+<x> (CSI u, 6=1+shift+ctrl) for pi/nvim
  ["cmd+shift+g"] = "\27[103;6u",
  ["cmd+shift+e"] = "\27[101;6u",
  ["cmd+shift+m"] = "\27[109;6u",
  ["cmd+shift+a"] = "\27[97;6u",
  ["cmd+shift+r"] = "\27[114;6u",
}
for key, text in pairs(sends) do
  rex.bind(key, "send_text", { text = text })
end

-- Pass alt+arrows through as real <M-Left>/<M-Right> (nvim buffer cycling),
-- not the client's default word-jump (ESC b / ESC f).
rex.unbind("alt+left")
rex.unbind("alt+right")

------------------------------------------------------------------------
-- Ideas for later (features from Nov 2026 previews, not used yet)
------------------------------------------------------------------------
-- rex.ui: actions can ask questions in the command palette.
--   Docs: https://www.superlogical.com/rex/docs/customize/custom-ui
--   Needs control API revision 17 (server preview.21+; check `rex version`).
--   Only inside an action's run(): not in rex.bind(key, fn), rex.on handlers,
--   pcall, rex.invoke or at top level (returns nil, "failed" there).
--   Both return nil, why on no answer: cancelled|timeout|no_client|unsupported|busy|failed.
--   Every connected app (Mac, iPhone) gets the prompt; first answer wins.
--
--   rex.ui.input{ title=, placeholder=, value=, confirm=, timeout= }  -> string
--   rex.ui.pick{ title=, items=, multiple=, allow_other=, ... }        -> id
--     items: "plain" or { id=, title=, subtitle=, icon=, detail=, selected= }
--     icons: document folder branch terminal code server database package
--            globe link person tag clock star gear plus
--     multiple=true -> list of ids (cmd+return confirms)
--     allow_other=true -> { text = "typed" } when nothing picked
--
--   Example: snippet picker on top of send_text (could replace some `sends`):
--   rex.action({
--     name = "pick_snippet",
--     title = "Send Snippet…",
--     category = "Terminal",
--     run = function(ctx)
--       local id = rex.ui.pick({
--         title = "Send snippet",
--         items = {
--           { id = "git status -sb\r", title = "git status", icon = "branch" },
--           { id = "kubectl get pods\r", title = "pods", icon = "server" },
--         },
--         allow_other = true,
--       })
--       if id == nil then return end
--       if type(id) == "table" then id = id.text .. "\r" end
--       rex.invoke("send_text", { text = id })
--     end,
--   })
--   Make args optional so `rex do` can skip the prompt:
--   args = { name = "string?" }; local v = args.name or rex.ui.input{...}
--
-- Copy mode: cmd+shift+c (bound above). Rebind keys with "copy/<key>":
--   rex.bind("copy/v", "pane.copy_mode.select", { mode = "..." })
--   Actions: pane.copy_mode.{move,select,yank,search,find,swap_ends,exit}
--   List: rex -C "<client>" actions | grep copy_mode
--
-- Port forwarding:
--   cmd+click a localhost URL in a remote pane -> auto-forward + open browser
--   Palette: "Forward Port…"; CLI: rex forward open <block-id|host:port>,
--   rex forward ls / close --orphaned. Terminal block method `ports` and event
--   `ports_changed` list listening ports (e.g. react to a dev server starting).
--
-- Every setting is an action: rex do client.setting.<group>.<key> [value=...]
--   e.g. client.setting.interface.panes.density value=compact; bindable too.
--   From the CLI needs Settings > Rex Server > Remote Control on.
--
-- Other things to try:
--   cmd+y Quick Look all links/files in pane (arrows step, works on remote files)
--   Toolbar behavior: Settings > Interface > Toolbar (Show on hover / Hidden,
--     opt+cmd+t reveals); pane headers On hover / Never (opt+shift+cmd+t)
--   Activity by priority: client.sidebar.activity.by_priority (agent status)
--   client.tab.mute: silence a noisy tab; "Insert File…" uploads to remote panes
--   rex.after / rex.every timers: only in `rex do` scripts, not this file
