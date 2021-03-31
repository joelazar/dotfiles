function qr-read
    set img $argv[1]
    cat $img | zbarimg -
end
