all: \
	update-forgit \
	update-oh-my-zsh \
	update-p10k \
	update-zsh-syntax-highlighting \
	update-kubetail

update-p10k:
	mkdir -p dot_oh-my-zsh/custom/themes
	curl -s -L -o p10k-master.tar.gz https://github.com/romkatv/powerlevel10k/archive/master.tar.gz
	chezmoi import --strip-components 1 --destination ${HOME}/.oh-my-zsh/custom/themes/powerlevel10k p10k-master.tar.gz

update-oh-my-zsh:
	curl -s -L -o oh-my-zsh-master.tar.gz https://github.com/robbyrussell/oh-my-zsh/archive/master.tar.gz
	chezmoi import --strip-components 1 --destination ${HOME}/.oh-my-zsh oh-my-zsh-master.tar.gz

update-zsh-syntax-highlighting:
	mkdir -p dot_oh-my-zsh/custom/plugins
	curl -s -L -o zsh-syntax-highlighting-master.tar.gz https://github.com/zsh-users/zsh-syntax-highlighting/archive/master.tar.gz
	chezmoi import --strip-components 1 --destination ${HOME}/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting zsh-syntax-highlighting-master.tar.gz

update-kubetail:
	mkdir -p dot_oh-my-zsh/custom/plugins
	curl -s -L -o kubetail-master.tar.gz https://github.com/johanhaleby/kubetail/archive/master.tar.gz
	chezmoi import --strip-components 1 --destination ${HOME}/.oh-my-zsh/custom/plugins/kubetail kubetail-master.tar.gz

update-forgit:
	mkdir -p dot_oh-my-zsh/custom/plugins
	curl -s -L -o forgit-master.tar.gz https://github.com/wfxr/forgit/archive/master.tar.gz
	chezmoi import --strip-components 1 --destination ${HOME}/.oh-my-zsh/custom/plugins/forgit forgit-master.tar.gz
