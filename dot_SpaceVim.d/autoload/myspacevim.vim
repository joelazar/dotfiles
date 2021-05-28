"parse Makefiles automatically for tasks plugin
function! s:make_tasks() abort
    if filereadable('Makefile')
        let subcmd = filter(readfile('Makefile', ''), "v:val=~#'^.PHONY'")
        if !empty(subcmd)
            let commands = split(subcmd[0])[1:]
            let conf = {}
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
            return conf
        else
            return {}
        endif
    else
        return {}
    endif
endfunction

function! myspacevim#before() abort

  let g:gruvbox_italic = 1
  " contrast options: soft, medium or hard
  let g:gruvbox_contrast_dark = "soft"
  let g:gruvbox_contrast_light = "medium"

 "  let g:ale_linters = {
 " \   'go': ['golangci-lint', 'gofmt', 'gopls', 'govet', 'golangserver', 'revive', 'staticcheck'],
 " \}
 "  let g:ale_linters_explicit = 1

  " Paste with <CTRL> + <Shift> + V - for gui mode
  imap <C-S-V> <C-R>*

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
  nnoremap <silent> <F5> :call SpaceVim#plugins#runner#open('make')

  let g:neoformat_enabled_yaml = ['prettier']
  let g:neoformat_enabled_python = ['black']
  let g:neoformat_enabled_sql = ['pg_format']

  " let g:go_fmt_options = {
  "   \ 'gofmt': '-s',
  "   \ }

  let g:go_fmt_command="gopls"
  let g:go_gopls_gofumpt=1
  let g:go_test_timeout= '20s'

  let g:nnn#layout = { 'window': { 'width': 0.9, 'height': 0.6, 'highlight': 'Debug' } }

  let g:nnn#action = {
      \ '<c-t>': 'tab split',
      \ '<c-x>': 'split',
      \ '<c-v>': 'vsplit' }

  set ttimeoutlen=5

  command Exec set splitright | vnew | set filetype=sh | read !sh #

  call SpaceVim#plugins#tasks#reg_provider(function('s:make_tasks'))

endfunction
