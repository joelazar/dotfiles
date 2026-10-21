complete -c gwt -f
complete -c gwt -s h -l help -d 'Show help'
complete -c gwt -n 'test (count (commandline -opc)) -eq 1' -a '(git for-each-ref --format="%(refname:short)" refs/heads 2>/dev/null)' -d 'Local branch'
complete -c gwt -n 'test (count (commandline -opc)) -eq 1' -a '(git for-each-ref --format="%(refname:lstrip=3)" refs/remotes/origin 2>/dev/null | string match -v HEAD)' -d 'Remote branch'
