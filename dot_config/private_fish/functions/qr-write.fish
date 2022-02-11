function qr-write --description 'write qr encoded data from a file'
    set file $argv[1]
    cat $file | qrencode -t UTF8
end
