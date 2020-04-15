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
