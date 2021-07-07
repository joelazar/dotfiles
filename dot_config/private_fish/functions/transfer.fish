# requirements: curl, fzf
# optional requirements: age (for encryption)

function transfer --description 'Uploads one file to transfer.sh'
    set -l file $argv[1]
    if test -z $argv[1]
        set file (fzf --prompt="Select the file which you want to upload" | awk '{ print $1; }')
        if test -z "$file"
            echo No file was selected.
            return
        end
    else if test (count $argv) -gt 1
        echo Too many arguments provided.
        return
    else
        set file $argv[1]
    end
    if read_confirm 'Do you want to encrypt the file? [y/N] '
        age -p $file >$file.age
        set file $file.age
        echo For decryption use the following command:
        echo age -d $file.age >$file
    end
    set -l days (echo 1\n7\n14 | fzf --prompt="For how many days do you want to store the file?" | awk '{ print $1; }')
    set -l downloads (echo 1\n2\n5\n10\n20\n100 | fzf --prompt="How many downloads are you allowing?" | awk '{ print $1; }')
    curl -H "Max-Downloads: $downloads" -H "Max-Days: $days" --upload-file $file https://transfer.sh/
end
