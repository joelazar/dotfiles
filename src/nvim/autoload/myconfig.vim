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
let g:neoformat_enabled_python = ['black']

let g:go_fmt_options = {
  \ 'gofmt': '-s',
  \ }

command Exec set splitright | vnew | set filetype=sh | read !sh #

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

call SpaceVim#plugins#tasks#reg_provider(function('s:make_tasks'))
