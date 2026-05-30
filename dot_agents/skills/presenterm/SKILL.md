---
name: presenterm
description: >
  Reference for the features supported by presenterm, a terminal-based markdown
  slideshow tool. Use this skill whenever the user works with presenterm: building
  or editing a presenterm deck, asking which presenterm features/commands/themes
  exist, how slides/columns/code blocks/diagrams/images/themes/exports work, what a
  comment command does, or mentions "presenterm", "terminal slides", or "markdown
  presentation" rendered in the terminal. This skill documents what presenterm
  supports — it does not prescribe slide content, wording, or presentation design.
disable-model-invocation: true
---

# presenterm

[presenterm](https://github.com/mfontanini/presenterm) renders a single markdown
file as slides in the terminal. A presentation is one `.md` file; the user runs it
with `presenterm slides.md`.

This skill is a **feature reference**. It describes which capabilities presenterm
supports and the exact syntax for each. It does not dictate what the slides should
say or how a talk should be structured.

---

## Presentation structure

### Slide separator

Slides are delimited by a single-line HTML comment:

```html
<!-- end_slide -->
```

`---` (thematic break) is **not** a separator by default — it can be enabled with
the `end_slide_shorthand` option (see [Options](#options)).

### Slide titles

Any [setext header](https://spec.commonmark.org/0.30/#setext-headings) is treated
as a slide title (centered, padded, distinct color):

```markdown
# Title
```

ATX headers (`#`, `##`, …) render as ordinary markdown headings, not slide titles,
unless `h1_slide_titles` is enabled.

### Introduction slide (front matter)

A YAML front matter block at the top generates an introduction slide. All fields
are optional:

```yaml
---
title: "My _first_ **presentation**"
sub_title: (in presenterm!)
author: Myself
---
```

`title` accepts arbitrary inline markdown (`**bold**`, `_italic_`, `<span>` tags).
For multiple authors use `authors:` (a list) instead of `author:`.

### Standard markdown

Ordered/unordered lists, headings, **bold**, _italic_, ~strikethrough~,
`inline code`, fenced code blocks, block quotes, tables, and links all render.

### Colored text

Only `<span>` tags are supported (no `<div>`, `<p>`, etc.). Two mechanisms:

```markdown
<span style="color: #ff0000; background-color: palette:foo">colored text</span>
<span class="my_class">palette-class colored text</span>
```

The `style` attribute supports only the CSS `color` and `background-color`
properties; both may reference theme palette colors via `palette:<name>` or
`p:<name>`. The `class` attribute references a class defined in the theme palette.

### Font sizes

Font size 1–7 (1 = default), supported **only in the kitty terminal ≥ 0.40.0**.
Set per-region via the `font_size` comment command; unsupported terminals ignore
it. Built-in themes set size 2 for titles and headings.

---

## Comment commands

presenterm uses single-line HTML comments as commands. Discover them live with
`presenterm --list-comment-commands`.

| Command                                       | Effect                                                          |
| --------------------------------------------- | --------------------------------------------------------------- |
| `<!-- end_slide -->`                          | End the current slide                                           |
| `<!-- pause -->`                              | Reveal following content on the next keypress                   |
| `<!-- new_line -->` / `<!-- new_lines: N -->` | Insert blank line(s)                                            |
| `<!-- jump_to_middle -->`                     | Vertically center following content (good for separator slides) |
| `<!-- column_layout: [3, 2] -->`              | Define a column layout (see [Layouts](#layouts))                |
| `<!-- column: 0 -->`                          | Enter a column (zero-indexed)                                   |
| `<!-- reset_layout -->`                       | Exit columns, return to full width                              |
| `<!-- incremental_lists: true -->` / `false`  | Reveal bullets one keypress at a time, until slide end          |
| `<!-- list_item_newlines: N -->`              | Blank lines between list items for the rest of the slide        |
| `<!-- no_footer -->`                          | Hide the footer on this slide                                   |
| `<!-- font_size: 2 -->`                       | Set font size for the rest of the slide (kitty only)            |
| `<!-- alignment: left\|center\|right -->`     | Text alignment for the rest of the slide                        |
| `<!-- skip_slide -->`                         | Exclude this slide from the presentation                        |
| `<!-- include: file.md -->`                   | Inline another markdown file (paths resolve relative to it)     |
| `<!-- snippet_output: id -->`                 | Place a referenced snippet's execution output here              |

### Non-command comments

A single-line HTML comment is assumed to be a command and errors if unrecognized.
For real comments use a multi-line comment, or the user-comment forms:

```markdown
<!-- // ignored personal note -->
<!-- comment: also ignored -->
```

The `command_prefix` option changes which comments are treated as commands.

---

## Layouts

Column layouts split a slide into proportional columns. Define the layout, then
enter each column before writing into it:

```markdown
# Layout example

<!-- column_layout: [2, 1] -->

<!-- column: 0 -->

Left column (2/3 of width).

<!-- column: 1 -->

![](image.png)

<!-- reset_layout -->

Full-width content below the columns.
```

`[2, 1]` totals 3 units: column 0 takes 2/3, column 1 takes 1/3. Any number of
columns and unit sizes are allowed. A column stays active until `reset_layout`,
the slide ends, or another `column` command. A layout like `[1, 3, 1]` with content
only in the middle column centers it at 60% width.

Press uppercase `T` while presenting to toggle a visual grid showing column widths.

---

## Code blocks

Standard fenced blocks with a language identifier are syntax-highlighted. Many
languages are supported (rust, python, go, bash, java, javascript/typescript, c,
c++, kotlin, ruby, sql, yaml, …); a subset also supports execution. Check the full
table at `docs/src/features/code/highlighting.md` in the presenterm repo.

### Block attributes

Attributes follow the language on the fence line:

| Attribute                             | Effect                                                                |
| ------------------------------------- | --------------------------------------------------------------------- |
| `+line_numbers`                       | Show line numbers                                                     |
| `+exec`                               | Make the block executable (run with `control+e`; needs `-x`)          |
| `+exec_replace`                       | Auto-execute and replace the block with its output (needs `-X`)       |
| `+auto_exec`                          | Like `+exec` but runs without pressing `control+e`                    |
| `+exec:<executor>`                    | Use an alternative executor (`rust-script`; `pytest`/`uv` for python) |
| `+id:<name>`                          | Name a snippet so its output can be placed via `snippet_output`       |
| `+image`                              | Like `+exec_replace`, render the output (must be a jpg/png image)     |
| `+render`                             | Pre-render mermaid / LaTeX / typst / d2 into an image at load time    |
| `+width:<n>%`                         | Width of a rendered/diagram image as a % of terminal width            |
| `+no_background`                      | Render the block without its background                               |
| `+pty`                                | Run inside a pseudo terminal (for `top`, `htop`, cursor-moving tools) |
| `+pty:<cols>:<rows>` / `+pty:standby` | Set PTY size / keep its area always visible                           |
| `+acquire_terminal`                   | Hand the raw TTY to an `+exec` program while it runs                  |
| `+validate` / `+expect:failure`       | Validate (but don't make executable) under `--validate-snippets`      |

### Selective and dynamic highlighting

````markdown
```rust {1,3,5-7}

```
````

````

Highlights only the listed lines/ranges. Using `|` creates frames that advance one
at a time as you move through the slide; `all` highlights everything:

```markdown
```rust {1,3|5-7|all}
````

````

### Hidden lines

Lines prefixed with the language's hide prefix are executed but not displayed:
`# ` for rust; `/// ` for python/bash/fish/shell/zsh/kotlin/java/javascript/
typescript/c/c++/go.

### External snippets

```markdown
```file +exec +line_numbers
path: snippet.rs
language: rust
start_line: 5
end_line: 10
````

````

### Execution notes

Execution is opt-in: enable `+exec` with `-x` (or `snippet.exec.enable`), and
`+exec_replace`/`+image` with `-X`. Output normally appears below the block; route
it elsewhere with `+id:<name>` plus `<!-- snippet_output: name -->` (the snippet
runs once and can be shown on later slides). `--validate-snippets` runs executable
and `+validate` snippets on load and reports non-zero exits.

> Running code from presentations is risky — only enable execution for decks you
> trust.

---

## Diagrams and rendered math

All use a fenced block with `+render`; each needs an external tool installed.

### Mermaid (`mermaid +render`, needs `mermaid-cli` / `mmdc`)

```markdown
```mermaid +render
sequenceDiagram
    Mark --> Bob: Hello!
    Bob --> Mark: Oh, hi mark!
````

````

Size via `+width:<n>%` or the `mermaid.scale` config. Theme via `mermaid.theme` /
`mermaid.background`.

### D2 (`d2 +render`, needs the `d2` CLI)

```markdown
```d2 +render
my_table: {
  shape: sql_table
  id: int {constraint: primary_key}
}
````

````

Size via `+width:<n>%` or `d2.scale`. Theme via `d2.theme`.

### LaTeX and typst (`latex +render` / `typst +render`)

```markdown
```latex +render
\[ \sum_{n=1}^{\infty} 2^{-n} = 1 \]
````

````

typst needs the `typst` binary; LaTeX additionally needs `pandoc` (it is converted
to typst, then rendered). Control output size via PPI (`typst.ppi` in config,
default 300) or per-block `+width:<n>%`.

To skip writing `+render` everywhere, list languages under
`options.auto_render_languages`.

---

## Images

```markdown
![](path/to/image.png)
![image:width:50%](image.png)
![image:w:300](image.png)
````

- Paths are relative to the presentation file. **Remote images are not supported.**
- Rendered at original size, scaled down to fit and preserve aspect ratio.
- Requires a terminal supporting the iTerm2, kitty, or sixel protocol (kitty,
  iTerm2, WezTerm, ghostty, foot); otherwise falls back to ASCII blocks.
- Size via `image:width:` / `image:w:` (percentage or pixels). The `image:` prefix
  is configurable via `image_attributes_prefix`.
- Under tmux, enable `allow-passthrough`. Force a protocol with `--image-protocol`
  if auto-detection fails.

---

## Themes

Built-in themes (no external files needed):

- `catppuccin-latte`, `catppuccin-frappe`, `catppuccin-macchiato`, `catppuccin-mocha`
- `dark`, `light`, `gruvbox-dark`
- `terminal-dark`, `terminal-light` (inherit the terminal's colors)
- `tokyonight-moon`, `tokyonight-day`, `tokyonight-night`, `tokyonight-storm`

Preview them all with `presenterm --list-themes`.

Select a theme by name, by light/dark variant, by path to a custom YAML theme, or
override parts inline:

```yaml
---
theme:
  name: dark
---
```

```yaml
---
theme:
  light: light # used when the terminal is light
  dark: dark # used when the terminal is dark
---
```

```yaml
---
theme:
  path: /home/me/epic-theme.yaml
---
```

```yaml
---
theme:
  override:
    default:
      colors:
        foreground: "beeeff"
---
```

Custom `.yaml` themes in the config themes dir (e.g.
`~/.config/presenterm/themes`) become usable like built-ins. Overrides hot-reload
on save. Theme overrides also configure the footer (`template` with left/center/
right, `progress_bar`, or `empty`) and the color `palette` used by `<span>` classes.

---

## Slide transitions

Animations between slides, configured in the config file
(`docs/src/configuration/settings.md#slide-transitions`): `fade`,
`slide_horizontal`, `collapse_horizontal`.

---

## Options

Set under `options:` in front matter (per-presentation) or in the config file:

| Option                        | Effect                                                                 |
| ----------------------------- | ---------------------------------------------------------------------- |
| `implicit_slide_ends`         | A slide title implies the previous slide ended (no `end_slide` needed) |
| `end_slide_shorthand`         | Allow `---` as a slide separator                                       |
| `h1_slide_titles`             | The first `h1` in a slide becomes its title                            |
| `command_prefix`              | Require a prefix (e.g. `cmd:`) for comments to count as commands       |
| `incremental_lists`           | Pause between every bullet in all lists                                |
| `image_attributes_prefix`     | Change the `image:` sizing prefix                                      |
| `auto_render_languages`       | Languages that render without an explicit `+render`                    |
| `list_item_newlines`          | Default blank lines between list items                                 |
| `strict_front_matter_parsing` | Whether unknown front-matter keys error                                |

Config-file-only settings (`defaults:`) include default theme, terminal font size,
preferred image protocol, `max_columns`/`max_rows` (with alignment), incremental
list pause behavior, and `validate_overflows`.

---

## Running and exporting

```bash
presenterm slides.md              # dev mode with hot reload
presenterm -p slides.md           # presentation mode (no reload)
presenterm -t dark slides.md      # override theme
presenterm -x slides.md           # enable +exec execution
presenterm -X slides.md           # enable +exec_replace / +image
presenterm --validate-snippets slides.md
presenterm --list-themes
presenterm --list-comment-commands
presenterm --export-pdf slides.md   # needs weasyprint
presenterm --export-html slides.md  # self-contained HTML, no extra deps
presenterm --export-pdf slides.md -o out.pdf
```

PDF export requires [weasyprint](https://pypi.org/project/weasyprint/); HTML export
has no extra dependencies. With `uv`:
`uv run --with weasyprint presenterm --export-pdf slides.md`.

### Navigation while presenting

Arrow keys / `hjkl` / page up-down move between slides. `gg` jumps to the first
slide, `G` to the last, `<n>G` to slide _n_. `control+p` opens the slide index
modal, `?` shows key bindings, `T` toggles the layout grid, `<ctrl>c` exits.
