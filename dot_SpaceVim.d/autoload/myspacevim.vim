"parse Makefiles automatically for tasks plugin
function! s:make_tasks() abort
    if filereadable('Makefile')
        let subcmds = filter(readfile('Makefile', ''), "v:val=~#'^.PHONY'")
        let conf = {}
        for subcmd in subcmds
            let commands = split(subcmd)[1:]
            for cmd in commands
                call extend(conf, {
                            \ cmd : {
                            \ 'command': 'make',
                            \ 'args' : [cmd],
                            \ 'isDetected' : 1,
                            \ 'detectedName' : 'make:'
                            \ }
                            \ })
            endfor
        endfor
        return conf
    else
        return {}
    endif
endfunction

function! myspacevim#before() abort

  let g:gruvbox_italic = 1
  " contrast options: soft, medium or hard
  let g:gruvbox_contrast_dark = "soft"
  let g:gruvbox_contrast_light = "medium"

  " Paste with <CTRL> + <Shift> + V - for gui mode
  imap <C-S-V> <C-R>*

  set guifont=Hack\ Nerd\ Font:h20
  " let g:neovide_refresh_rate=50
  " let g:neovide_fullscreen=v:true
  let g:neovide_cursor_animation_length=0.0
  let g:neovide_cursor_trail_length=0.0

endfunction


function! myspacevim#after() abort

"treesitter configuration - TSInstall go, javascript, yaml, lua, python
lua <<EOF
require'nvim-treesitter.configs'.setup {
  -- Modules and its options go here
  highlight = { enable = true },
  incremental_selection = { enable = true },
  textobjects = { enable = true },
}
vim.cmd [[highlight IndentOne guifg=#BF616A guibg=NONE gui=nocombine]]
vim.cmd [[highlight IndentTwo guifg=#D08770 guibg=NONE gui=nocombine]]
vim.cmd [[highlight IndentThree guifg=#EBCB8B guibg=NONE gui=nocombine]]
vim.cmd [[highlight IndentFour guifg=#A3BE8C guibg=NONE gui=nocombine]]
vim.cmd [[highlight IndentFive guifg=#5E81AC guibg=NONE gui=nocombine]]
vim.cmd [[highlight IndentSix guifg=#88C0D0 guibg=NONE gui=nocombine]]
vim.cmd [[highlight IndentSeven guifg=#B48EAD guibg=NONE gui=nocombine]]
vim.g.indent_blankline_char = "│"
vim.g.indent_blankline_char_highlight_list = {
    "IndentOne", "IndentTwo", "IndentThree", "IndentFour", "IndentFive",
    "IndentSix", "IndentSeven"
}
vim.g.indent_blankline_show_first_indent_level = true
vim.g.indent_blankline_filetype_exclude = {
    "startify", "dashboard", "dotooagenda", "log", "fugitive", "gitcommit",
    "packer", "vimwiki", "markdown", "json", "txt", "vista", "help",
    "todoist", "NvimTree", "peekaboo", "git", "TelescopePrompt", "undotree",
    "flutterToolsOutline", "" -- for all buffers without a file type
}
vim.g.indent_blankline_buftype_exclude = {"terminal", "nofile"}
vim.g.indent_blankline_show_trailing_blankline_indent = false
vim.g.indent_blankline_show_current_context = true
vim.g.indent_blankline_context_patterns = {
    "class", "function", "method", "block", "list_literal", "selector",
    "^if", "^table", "if_statement", "while", "for"
}
-- because lazy load indent-blankline so need readd this autocmd
vim.cmd('autocmd CursorMoved * IndentBlanklineRefresh')
EOF

  let g:codi#width = 50.0
  "case-insensitive search
  set ignorecase smartcase
  "wrap lines
  set wrap
  "automatically save before :next, :make etc.
  set autowrite
  "search for visually selected text
  vnoremap // y/<C-R>"<CR>
  "have the same buffer on clipboard for multiple pastes
  xnoremap p pgvy
  "add new line below
  nnoremap oo o<Esc>k
  "add new line above
  nnoremap OO O<Esc>j
  "start new line for RETURN
  nnoremap <CR> o<Esc>
  "start async build job
  nnoremap <silent> <F9> :call SpaceVim#plugins#runner#open('make')<CR>
  nnoremap <silent> <F10> :call SpaceVim#plugins#runner#open('make test')<CR>

  let g:neoformat_enabled_yaml = ['prettier']
  let g:neoformat_enabled_python = ['black']
  let g:neoformat_enabled_sql = ['pg_format']

  " https://youtu.be/PEm0QJ46hNo
  inoremap <C-H> <C-W>

  " let g:go_fmt_options = {
  "   \ 'gofmt': '-s',
  "   \ }

  let g:go_fmt_command="gopls"
  let g:go_gopls_gofumpt=1
  let g:go_test_timeout= '60s'

  let g:nnn#layout = { 'window': { 'width': 0.9, 'height': 0.6, 'highlight': 'Debug' } }

  let g:nnn#action = {
      \ '<c-t>': 'tab split',
      \ '<c-x>': 'split',
      \ '<c-v>': 'vsplit' }

  set ttimeoutlen=5

  " let g:himalaya_mailbox_picker = 'fzf'
  " nnoremap <silent> <leader>h :Himalaya<CR>

  " setup mapping to call :LazyGit
  nnoremap <silent> <leader>lg :LazyGit<CR>

  command Exec set splitright | vnew | set filetype=sh | read !sh #

  call SpaceVim#plugins#tasks#reg_provider(function('s:make_tasks'))

endfunction
