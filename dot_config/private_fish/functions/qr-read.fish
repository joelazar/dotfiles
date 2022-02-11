function qr-read --description 'read qr encoded data from a file'
    set img $argv[1]
    cat $img | zbarimg -
end
