# 🔐 FIDO2 File Encryption Manager for Fish Shell

function fido2
    set -l config_dir ~/.config/fido2-crypt
    set -l subcommand $argv[1]
    set -e argv[1]

    switch $subcommand
        case setup
            # 🔑 Generate new FIDO2 recipient key and save to config
            mkdir -p $config_dir

            echo "🔑 Generating new FIDO2 recipient key..."
            # install github.com/olastor/age-plugin-fido2-hmac beforehand
            age-plugin-fido2-hmac -g >$config_dir/setup.txt

            # Extract the public key
            grep "# public key:" $config_dir/setup.txt | sed 's/# public key: //' >$config_dir/recipient.txt

            # Extract identity if separate identity was chosen
            grep AGE-PLUGIN-FIDO2-HMAC- $config_dir/setup.txt >$config_dir/identity.txt 2>/dev/null

            echo "✅ Setup complete! Recipient key saved to $config_dir/recipient.txt"
            if test -s $config_dir/identity.txt
                echo "🆔 Identity saved to $config_dir/identity.txt"
            end

        case encrypt e
            # 🔒 Encrypt any file
            set -l file $argv[1]

            if test -z "$file"
                echo "📝 Usage: fido2 encrypt <file>"
                return 1
            end

            if not test -f "$file"
                echo "❌ Error: $file not found"
                return 1
            end

            if not test -f "$config_dir/recipient.txt"
                echo "⚠️  Error: No recipient key found. Run 'fido2 setup' first."
                return 1
            end

            set -l recipient (cat $config_dir/recipient.txt)
            echo "👆 Touch your FIDO2 key to encrypt..."
            age -r $recipient -o "$file.age" "$file"

            if test $status -eq 0
                echo "✅ Encrypted $file → $file.age"
                echo "💡 Tip: You can now delete the original file: fido2 shred $file"
            else
                echo "❌ Encryption failed"
                return 1
            end

        case decrypt d
            # 🔓 Decrypt file to stdout or to a file
            set -l file $argv[1]
            set -l output_file $argv[2]

            if test -z "$file"
                echo "📝 Usage: fido2 decrypt <file.age> [output-file]"
                return 1
            end

            if not test -f "$file"
                echo "❌ Error: $file not found"
                return 1
            end

            if test -n "$output_file"
                echo "👆 Touch your FIDO2 key to decrypt..."

                if test -f "$config_dir/identity.txt"
                    age -d -i $config_dir/identity.txt $file >$output_file
                else
                    age -d -j fido2-hmac $file >$output_file
                end

                if test $status -eq 0
                    echo "✅ Decrypted $file → $output_file"
                else
                    echo "❌ Decryption failed"
                    rm -f $output_file
                    return 1
                end
            else
                echo "👆 Touch your FIDO2 key to decrypt..." >&2

                if test -f "$config_dir/identity.txt"
                    age -d -i $config_dir/identity.txt $file
                else
                    age -d -j fido2-hmac $file
                end

                if test $status -ne 0
                    echo "❌ Decryption failed" >&2
                    return 1
                end
            end

        case view v cat
            # 👀 View encrypted file content (with pager)
            set -l file $argv[1]

            if test -z "$file"
                echo "📝 Usage: fido2 view <file.age>"
                return 1
            end

            if not test -f "$file"
                echo "❌ Error: $file not found"
                return 1
            end

            echo "👆 Touch your FIDO2 key to decrypt..."

            if test -f "$config_dir/identity.txt"
                age -d -i $config_dir/identity.txt $file | less
            else
                age -d -j fido2-hmac $file | less
            end

        case edit ed
            # ✏️  Edit encrypted file
            set -l file $argv[1]
            set -l editor $EDITOR

            if test -z "$editor"
                set editor nano
            end

            if test -z "$file"
                echo "📝 Usage: fido2 edit <file.age>"
                return 1
            end

            if not test -f "$file"
                echo "❌ Error: $file not found"
                return 1
            end

            if not test -f "$config_dir/recipient.txt"
                echo "⚠️  Error: No recipient key found. Run 'fido2 setup' first."
                return 1
            end

            set -l temp_file (mktemp)
            set -l recipient (cat $config_dir/recipient.txt)

            echo "👆 Touch your FIDO2 key to decrypt..."

            # Decrypt to temp file
            if test -f "$config_dir/identity.txt"
                age -d -i $config_dir/identity.txt $file >$temp_file
            else
                age -d -j fido2-hmac $file >$temp_file
            end

            if test $status -ne 0
                echo "❌ Decryption failed"
                rm $temp_file
                return 1
            end

            # Save original checksum
            set -l original_checksum (shasum -a 256 $temp_file | awk '{print $1}')

            # Edit the file
            $editor $temp_file

            # Check if file was modified
            set -l new_checksum (shasum -a 256 $temp_file | awk '{print $1}')

            if test "$original_checksum" = "$new_checksum"
                echo "ℹ️  No changes made"
                rm $temp_file
                return 0
            end

            # Re-encrypt if file was modified
            echo "👆 Touch your FIDO2 key to re-encrypt..."
            age -r $recipient -o $file $temp_file

            if test $status -eq 0
                echo "✅ File updated: $file"
            else
                echo "❌ Re-encryption failed"
            end

            # Clean up
            rm $temp_file

        case list ls
            # 📋 List encrypted files
            set -l search_path $argv[1]

            if test -z "$search_path"
                set search_path "."
            end

            set -l files (find $search_path -name "*.age" -type f 2>/dev/null)

            if test (count $files) -eq 0
                echo "🔍 No encrypted files found in $search_path"
            else
                echo "🔐 Encrypted files in $search_path:"
                for file in $files
                    set -l size (du -h $file | cut -f1)
                    set -l modified (stat -f "%Sm" -t "%Y-%m-%d %H:%M" $file 2>/dev/null; or stat -c "%y" $file 2>/dev/null | cut -d' ' -f1-2)
                    echo "  📄 $file ($size) - $modified"
                end
            end

        case reencrypt re
            # 🔄 Re-encrypt file with new recipient
            set -l file $argv[1]

            if test -z "$file"
                echo "📝 Usage: fido2 reencrypt <file.age>"
                return 1
            end

            if not test -f "$file"
                echo "❌ Error: $file not found"
                return 1
            end

            if not test -f "$config_dir/recipient.txt"
                echo "⚠️  Error: No recipient key found. Run 'fido2 setup' first."
                return 1
            end

            set -l temp_file (mktemp)
            set -l recipient (cat $config_dir/recipient.txt)

            echo "👆 Touch your FIDO2 key to decrypt with old key..."

            # Decrypt with old key
            if test -f "$config_dir/identity.txt"
                age -d -i $config_dir/identity.txt $file >$temp_file
            else
                age -d -j fido2-hmac $file >$temp_file
            end

            if test $status -ne 0
                echo "❌ Decryption failed"
                rm $temp_file
                return 1
            end

            echo "👆 Touch your FIDO2 key to encrypt with new key..."
            age -r $recipient -o $file $temp_file

            if test $status -eq 0
                echo "✅ File re-encrypted: $file"
            else
                echo "❌ Re-encryption failed"
            end

            # Clean up
            rm $temp_file

        case shred rm
            # 🗑️  Securely delete original file after encryption
            set -l file $argv[1]

            if test -z "$file"
                echo "📝 Usage: fido2 shred <file>"
                echo "   Use this to securely delete the original file after encryption"
                return 1
            end

            if not test -f "$file"
                echo "❌ Error: $file not found"
                return 1
            end

            if not test -f "$file.age"
                echo "⚠️  Warning: No encrypted version found ($file.age)"
                echo "   Are you sure you want to delete $file?"
                read -l -P "   Type 'yes' to confirm: " confirm
                if test "$confirm" != yes
                    echo "❌ Cancelled"
                    return 1
                end
            end

            # Use shred if available, otherwise use rm
            if command -v shred >/dev/null 2>&1
                shred -vzu $file
                echo "🗑️  Securely deleted: $file"
            else if command -v gshred >/dev/null 2>&1
                gshred -vzu $file
                echo "🗑️  Securely deleted: $file"
            else
                rm -f $file
                echo "🗑️  Deleted: $file (warning: not securely overwritten)"
            end

        case info status
            # ℹ️  Show configuration status
            echo "🔐 FIDO2 Configuration Status"
            echo ""
            echo "📁 Config directory: $config_dir"

            if test -f "$config_dir/recipient.txt"
                echo "✅ Recipient key configured"
                echo "   🔑 Key: "(head -c 50 $config_dir/recipient.txt)"..."
            else
                echo "❌ No recipient key found - run 'fido2 setup'"
            end

            if test -f "$config_dir/identity.txt"
                echo "✅ Identity file present"
            else
                echo "ℹ️  Using embedded credential (no separate identity file)"
            end

            echo ""
            set -l age_count (find . -name "*.age" -type f 2>/dev/null | wc -l | string trim)
            echo "📊 Statistics:"
            echo "   📄 Encrypted files in current directory: $age_count"

        case help h '*'
            # ℹ️  Show help
            echo "🔐 FIDO2 File Encryption Manager"
            echo ""
            echo "Usage: fido2 <command> [arguments]"
            echo ""
            echo "Setup & Configuration:"
            echo "  setup                    🔑 Generate new FIDO2 recipient key"
            echo "  info, status             ℹ️ Show configuration status"
            echo ""
            echo "Encryption & Decryption:"
            echo "  encrypt, e <file>        🔒 Encrypt a file"
            echo "  decrypt, d <file> [out]  🔓 Decrypt file (to stdout or file)"
            echo ""
            echo "File Operations:"
            echo "  view, v, cat <file>      👀 View encrypted file content"
            echo "  edit, ed <file>          ✏️ Edit encrypted file"
            echo "  list, ls [path]          📋 List encrypted files"
            echo "  reencrypt, re <file>     🔄 Re-encrypt with new key"
            echo "  shred, rm <file>         🗑️ Securely delete original file"
            echo ""
            echo "Examples:"
            echo "  fido2 setup              # Initial setup"
            echo "  fido2 encrypt secret.txt # Encrypt file to secret.txt.age"
            echo "  fido2 view secret.txt.age # View encrypted content"
            echo "  fido2 edit notes.age     # Edit encrypted file"
            echo "  fido2 decrypt data.age output.txt # Decrypt to file"
            echo ""
            echo "All encrypted files have .age extension"
            echo "Config stored in: ~/.config/fido2-crypt/"
    end
end

# Completions for the fido2 command
complete -c fido2 -f
complete -c fido2 -n __fish_use_subcommand -a setup -d "Generate new FIDO2 recipient key"
complete -c fido2 -n __fish_use_subcommand -a "encrypt e" -d "Encrypt a file"
complete -c fido2 -n __fish_use_subcommand -a "decrypt d" -d "Decrypt file"
complete -c fido2 -n __fish_use_subcommand -a "view v cat" -d "View encrypted file"
complete -c fido2 -n __fish_use_subcommand -a "edit ed" -d "Edit encrypted file"
complete -c fido2 -n __fish_use_subcommand -a "list ls" -d "List encrypted files"
complete -c fido2 -n __fish_use_subcommand -a "reencrypt re" -d "Re-encrypt with new key"
complete -c fido2 -n __fish_use_subcommand -a "shred rm" -d "Securely delete file"
complete -c fido2 -n __fish_use_subcommand -a "info status" -d "Show configuration status"
complete -c fido2 -n __fish_use_subcommand -a "help h" -d "Show help"

# File completions for subcommands
complete -c fido2 -n "__fish_seen_subcommand_from encrypt e" -F
complete -c fido2 -n "__fish_seen_subcommand_from decrypt d view v cat edit ed reencrypt re" -f -a "(find . -name '*.age' -type f 2>/dev/null)"
complete -c fido2 -n "__fish_seen_subcommand_from shred rm" -F
