call plug#begin()
Plug 'airblade/vim-gitgutter'
Plug 'airblade/vim-rooter'
Plug 'fatih/vim-go', { 'do': ':GoUpdateBinaries' }
Plug 'junegunn/fzf'
Plug 'junegunn/fzf.vim'
Plug 'lambdalisue/suda.vim'
Plug 'MattesGroeger/vim-bookmarks'
Plug 'morhetz/gruvbox'
Plug 'sbdchd/neoformat'
Plug 'scrooloose/nerdtree'
Plug 'Shougo/deoplete.nvim', { 'do': ':UpdateRemotePlugins' }
Plug 'terryma/vim-smooth-scroll'
Plug 'tpope/vim-fugitive'
Plug 'tpope/vim-surround'
Plug 'vim-airline/vim-airline'
Plug 'w0rp/ale'
call plug#end()

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
" vnoremap K y:Rg <C-R>"<CR>
vnoremap // y/<C-R>"<CR>
nmap oo o<Esc>k
nmap OO O<Esc>j
nmap <CR> o<Esc>

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

" bind K to grep word under cursor
nnoremap K :Rg <C-R><C-W><CR>

let g:rooter_change_directory_for_non_project_files = 'current'

let g:airline_powerline_fonts=1

" Short quickfix list
au FileType qf call AdjustWindowHeight(3, 10)
function! AdjustWindowHeight(minheight, maxheight)
  exe max([min([line("$"), a:maxheight]), a:minheight]) . "wincmd _"
endfunction

" Diffmode
if &diff
    map <C-1> :diffget BA<CR>
    map <C-2> :diffget LO<CR>
    map <C-3> :diffget RE<CR>
    highlight! link DiffText MatchParen
endif

" Neoformat
" Enable alignment
let g:neoformat_basic_format_align = 1
" Enable tab to spaces conversion
let g:neoformat_basic_format_retab = 1
" Enable trimmming of trailing whitespace
let g:neoformat_basic_format_trim = 1

" Vim-GO
let g:go_term_enabled = 0
let g:go_highlight_types = 1
let g:go_highlight_fields = 1
let g:go_highlight_function_calls = 1
let g:go_def_mapping_enabled = 0
autocmd FileType go nmap gd <Plug>(go-def)

" FZF
nnoremap <C-t> :FZF<Cr>

" Deoplete
let g:deoplete#enable_at_startup = 1
let g:deoplete#sources#go#gocode_binary	= '$HOME/go/bin/gocode'
let g:deoplete#sources#go#sort_class = ['package', 'func', 'type', 'var', 'const']

inoremap <expr> <Tab> pumvisible() ? "\<C-n>" : "\<Tab>"
inoremap <expr> <S-Tab> pumvisible() ? "\<C-p>" : "\<S-Tab>"

let g:go_doc_keywordprg_enabled = 0

" ALE
let g:ale_completion_enabled = 0

" In ~/.vim/vimrc, or somewhere similar.
let g:ale_fixers = {
\   '*': ['remove_trailing_lines', 'trim_whitespace'],
\   'python': ['yapf'],
\}

source ~/.config/nvim/local.vim
