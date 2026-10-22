-- Rex config. Only non-default bindings are listed.
-- Docs: https://www.superlogical.com/rex/docs
-- Default shortcuts: command palette (cmd+shift+p) or "Change Shortcut…".
-- Check: rex config check   Reload: rex config reload (Rex doesn't watch this file)
-- Appearance, font and other app settings live in the app (see run_onchange_set-rex).

local terminal = "com.superlogical.terminal"

-- Type raw bytes into the focused terminal, like Ghostty's `text:` keybind.
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

-- Floating terminal over the current window, in the focused pane's directory.
-- Closes when its program exits.
local function float(command)
  return function(ctx)
    local p = rex.block.call(terminal, "process", { block_id = ctx.block_id })
    local cwd = p and p.foreground and p.foreground.cwd
    local _, err = rex.session.new_layer({
      bounds = { 0.05, 0.05, 0.9, 0.9 },
      focus = true,
      layout = rex.layout.block({
        flavor = "com.superlogical.terminal.shell",
        options = { command = command, cwd = cwd },
      }),
    })
    if err ~= nil then
      error(err, 0)
    end
  end
end

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

rex.action({ name = "float_lazygit", title = "Lazygit (floating)", category = "Layouts", run = float({ "lazygit" }) })
rex.action({ name = "float_shell", title = "Scratch Shell (floating)", category = "Layouts", run = float(nil) })

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

------------------------------------------------------------------------
-- Panes
------------------------------------------------------------------------
rex.bind("cmd+ctrl+h", "pane.focus.left")
rex.bind("cmd+ctrl+j", "pane.focus.down")
rex.bind("cmd+ctrl+k", "pane.focus.up")
rex.bind("cmd+ctrl+l", "pane.focus.right")

-- resize mode: cmd+ctrl+r, then h/j/k/l; escape leaves
rex.mode("resize", { exclusive = true })
rex.bind("cmd+ctrl+r", "client.mode.enter", { name = "resize" })
rex.bind("resize/h", "pane.resize", { direction = "left" })
rex.bind("resize/j", "pane.resize", { direction = "down" })
rex.bind("resize/k", "pane.resize", { direction = "up" })
rex.bind("resize/l", "pane.resize", { direction = "right" })

-- smart-splits: ctrl+h/j/k/l moves between Rex panes, but passes the key
-- through when nvim is in the foreground (nvim moves out at its own edge, see
-- ~/Code/joelazar/smart-splits-rex.md) or when there is no pane that way
-- (so ctrl+l still clears the shell, ctrl+h still backspaces).
local function focused_block()
  local v = rex.session.view({})
  if v == nil then
    return nil
  end
  for _, w in ipairs(v.windows or {}) do
    if w.window_id == v.active_window_id then
      return w.focused_block_id
    end
  end
end

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
    return focused_block() ~= ctx.block_id
  end
end

rex.bind("ctrl+h", smart_nav("left"))
rex.bind("ctrl+j", smart_nav("down"))
rex.bind("ctrl+k", smart_nav("up"))
rex.bind("ctrl+l", smart_nav("right"))

------------------------------------------------------------------------
-- Floats
------------------------------------------------------------------------
rex.bind("cmd+alt+g", "float_lazygit")
rex.bind("cmd+alt+t", "float_shell")

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
  ["cmd+shift+c"] = "\27[99;6u",
  ["cmd+shift+e"] = "\27[101;6u",
  ["cmd+shift+m"] = "\27[109;6u",
  ["cmd+shift+a"] = "\27[97;6u",
  ["cmd+shift+r"] = "\27[114;6u",
}
for key, text in pairs(sends) do
  rex.bind(key, "send_text", { text = text })
end
