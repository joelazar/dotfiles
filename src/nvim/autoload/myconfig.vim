"case-insensitive search
set ignorecase smartcase 
"wrap lines
set wrap
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

let g:neoformat_enabled_yaml = ['prettier']

let g:go_fmt_options = {
  \ 'gofmt': '-s',
  \ }

"let g:neoformat_python_black = {
"    \ 'exe': 'black',
"    \ 'stdin': 1,
"    \ 'args': ['-q', '-', '-l', '100'],
"    \ }

let g:neoformat_enabled_python = ['black']

command Exec set splitright | vnew | set filetype=sh | read !sh #
