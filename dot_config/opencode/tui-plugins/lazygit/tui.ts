// lazygit from inside OpenCode, ported from ~/Code/joelazar/pi-lazygit.
// `/lazygit` or ctrl+shift+g opens lazygit in the current session's directory:
// - inside Rex (REX_SESSION set): a full-window floating layer over this tab; quitting lazygit closes it
// - elsewhere: suspends the TUI, hands lazygit the terminal, and resumes when it exits
// TUI-only, so it's loaded from cli.json rather than the server's plugins/ discovery.
import { spawn, spawnSync } from "node:child_process"
import { Plugin } from "@opencode/plugin/tui"

const COMMAND = "lazygit"

function lazygitAvailable(): boolean {
  return !spawnSync(COMMAND, ["--version"], { stdio: "ignore" }).error
}

/** Returns null on success, or the reason opening the Rex layer failed. */
function openRexLayer(cwd: string): string | null {
  const layer = {
    bounds: [0, 0, 1, 1],
    focus: true,
    layout: {
      block: {
        flavor: "com.superlogical.terminal.shell",
        label: COMMAND,
        options: { command: [COMMAND], cwd },
      },
    },
  }
  const result = spawnSync(
    "rex",
    ["api", "call", "-s", process.env.REX_SESSION!, "session.new_layer", JSON.stringify(layer)],
    { encoding: "utf8" },
  )
  if (result.error) return result.error.message
  if (result.status !== 0) return result.stderr.trim() || `exit ${result.status}`
  return null
}

export default Plugin.define({
  id: "joe.lazygit",
  setup(context) {
    const directory = (): string => {
      const route = context.ui.router.current()
      if (route.type === "session") {
        const session = context.data.session.get(route.sessionID)
        if (session) return session.location.directory
      }
      return (context.location ?? context.data.location.default()).directory
    }

    const runInline = async (cwd: string) => {
      const renderer = context.renderer
      await renderer.suspend()
      process.stdout.write("\x1b[2J\x1b[H")
      try {
        await new Promise<void>((resolve) => {
          const child = spawn(COMMAND, { stdio: "inherit", cwd, env: process.env })
          child.on("exit", () => resolve())
          child.on("error", () => resolve())
        })
      } finally {
        await renderer.resume()
        renderer.requestRender()
      }
    }

    const open = async () => {
      if (!lazygitAvailable()) {
        context.ui.toast.show({ message: "Could not start lazygit. Is it on your PATH?", variant: "error" })
        return
      }
      const cwd = directory()
      if (process.env.REX_SESSION) {
        const error = openRexLayer(cwd)
        if (!error) return
        context.ui.toast.show({ message: `Rex layer failed, running inline: ${error}`, variant: "warning" })
      }
      await runInline(cwd)
    }

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "joe.lazygit.open",
          title: "Open lazygit",
          group: "Git",
          bind: "ctrl+shift+g",
          palette: true,
          slash: { name: "lazygit" },
          run: () => {
            void open()
          },
        },
      ],
      bindings: ["joe.lazygit.open"],
    }))
  },
})
