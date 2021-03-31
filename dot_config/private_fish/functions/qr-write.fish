function qr-write
    set file $argv[1]
    cat $file | qrencode -t UTF8
end
