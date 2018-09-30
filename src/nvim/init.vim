call plug#begin()
Plug 'terryma/vim-smooth-scroll'
Plug 'scrooloose/nerdtree'
Plug 'tmhedberg/SimpylFold'
Plug 'lambdalisue/suda.vim'
Plug 'morhetz/gruvbox'
Plug 'MattesGroeger/vim-bookmarks'
Plug 'tpope/vim-fugitive'
Plug 'airblade/vim-rooter'
Plug 'airblade/vim-gitgutter'
Plug 'Shougo/deoplete.nvim', { 'do': ':UpdateRemotePlugins' }
Plug 'zchee/deoplete-go', { 'do': 'make'}
Plug 'zchee/deoplete-jedi'
Plug 'fatih/vim-go', { 'do': ':GoUpdateBinaries' }
Plug 'rking/ag.vim'
"Plug 'ctrlpvim/ctrlp.vim'
Plug 'vim-airline/vim-airline'
Plug 'vim-syntastic/syntastic'
Plug 'google/vim-maktaba'
Plug 'google/vim-codefmt'
Plug 'google/vim-glaive'
Plug 'tpope/vim-fugitive'
Plug 'tpope/vim-surround'
Plug 'junegunn/fzf'
Plug 'sbdchd/neoformat'
call plug#end()

" Use deoplete.
let g:deoplete#enable_at_startup = 1

let g:deoplete#sources#go#gocode_binary	= '/home/jlazar/go/bin/gocode'

let g:deoplete#sources#go#sort_class = ['package', 'func', 'type', 'var', 'const']

inoremap <expr> <Tab> pumvisible() ? "\<C-n>" : "\<Tab>"
inoremap <expr> <S-Tab> pumvisible() ? "\<C-p>" : "\<S-Tab>"

let g:go_doc_keywordprg_enabled = 0

" General
syntax on
set number
set incsearch            "incremental search
set ignorecase smartcase "case-insensitive search
set hlsearch             "highlight search
set autoindent
set expandtab
set shiftwidth=2
set softtabstop=2
set cursorline           "highlight the current line.
set encoding=utf-8
set wildignore+=*/tmp/*,*.so,*.swp,*.zip
set wrap
set linebreak
set nobackup

" note trailing space at end of next line
set showbreak=>\ \ \
set showmode

" Theme
set termguicolors
"set background=dark " for the dark version
set background=light " for the light version
let g:gruvbox_italic=1
let g:gruvbox_contrast_light = 'hard'
let g:gruvbox_contrast_dark  = 'soft'
colorscheme gruvbox

set foldlevel=10

" Remaps
map <C-n> :NERDTree<CR>
" Movement mapping between split screens
nnoremap <C-J> <C-W><C-J>
nnoremap <C-K> <C-W><C-K>
nnoremap <C-L> <C-W><C-L>
nnoremap <C-H> <C-W><C-H>
" Enable folding with the spacebar
nnoremap <space> za
" CD to vim, print current directory
nnoremap ,cd :cd %:p:h<CR>:pwd<CR>
" paste multiple times the same register
xnoremap p pgvy
" no need for arrows
map <up> <nop>
map <down> <nop>
map <left> <nop>
map <right> <nop>
" no arrows in insertmode either
imap <up> <nop>
imap <down> <nop>
imap <left> <nop>
imap <right> <nop>
" visual selection search
vnoremap K y:Ag! <C-R>"<CR>
vnoremap // y/<C-R>"<CR>
nmap oo o<Esc>k
nmap OO O<Esc>j
nmap <CR> o<Esc>
" Ag to Ag! always
ca Ag Ag!
ca ag Ag!

" F2 - paste mode
nnoremap <F2> :set invpaste paste?<CR>
set pastetoggle=<F2>

" F5 - delete all trailing spaces
nnoremap <silent> <F5> :let _s=@/ <Bar> :%s/\s\+$//e <Bar> :let @/=_s <Bar> :nohl <Bar> :unlet _s <CR>

" Sudo save
" command W w !sudo tee > /dev/null % TODO - currently not working - https://github.com/neovim/neovim/issues/1716
command W w suda://%

" Automagically delete trailing spaces in specific filetypes
autocmd FileType c,cpp,sdl,sdt,h,hpp,txt,py autocmd BufWritePre <buffer> %s/\s\+$//e

" Use The Silver Searcher as grepprg
set grepprg=ag\ --nogroup\ --nocolor

" bind K to grep word under cursor
nnoremap K :Ag! "\b<C-R><C-W>\b"<CR>:cw<CR><Paste>
" customize ag arguments here - this is the default one
let g:ag_prg="ag --vimgrep --smart-case"
" Use ag in CtrlP for listing files. Lightning fast and respects .gitignore
" let g:ctrlp_user_command = 'ag %s -l --nocolor -g ""'

"let g:ctrlp_working_path_mode = 'r'
"let g:ctrlp_custom_ignore = {
"  \ 'dir':  '\v[\/]\.(git|hg|svn)$',
"  \ 'file': '\v\.(exe|so|dll)$',
"  \ }

" ag is fast enough that CtrlP doesn't need to cache
"let g:ctrlp_use_caching = 0

let g:rooter_change_directory_for_non_project_files = 'current'

let g:airline_powerline_fonts=1

" Short quickfix list
au FileType qf call AdjustWindowHeight(3, 10)
function! AdjustWindowHeight(minheight, maxheight)
  exe max([min([line("$"), a:maxheight]), a:minheight]) . "wincmd _"
endfunction

source ~/.config/nvim/local.vim

" syntastic begin
set statusline+=%#warningmsg#
set statusline+=%{SyntasticStatuslineFlag()}
set statusline+=%*

let g:syntastic_always_populate_loc_list = 1
let g:syntastic_auto_loc_list = 1
let g:syntastic_mode_map = {
    \ "mode": "passive",
    \ "active_filetypes": [""],
    \ "passive_filetypes": [""] }

" let g:syntastic_check_on_open = 1
" let g:syntastic_check_on_wq = 1
" syntastic end
"

if &diff
    map <C-1> :diffget BA<CR>
    map <C-2> :diffget LO<CR>
    map <C-3> :diffget RE<CR>
    highlight! link DiffText MatchParen
endif

nnoremap <C-t> :FZF<Cr>
