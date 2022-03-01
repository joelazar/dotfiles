function errlogs -d 'show the errors in logs since boot'
    printf "%s\n" -----------
    printf "%s\n" "[#] JOURNAL"
    printf "%s\n" -----------
    journalctl -b -p 0..3 $argv
    printf "%s\n" ------------------------
    printf "%s\n" "[#] SYSTEMD FAILED UNITS"
    printf "%s\n" ------------------------
    set -l sys_srv (systemctl --failed | jc --systemctl | jq -r '.[].unit')
    if [ "$sys_srv[1]" != 0 ]
        printf "%s\n" "$sys_srv"
    else
        printf "%s\n" NONE
    end
    printf "%s\n" -----------------------------
    printf "%s\n" "[#] SYSTEMD USER FAILED UNITS"
    printf "%s\n" -----------------------------
    set -l usr_srv (systemctl --user --failed | jc --systemctl | jq -r '.[].unit')
    if [ "$usr_srv[1]" != 0 ]
        printf "%s\n\n" "$usr_srv"
    else
        printf "%s\n\n" NONE
    end
end
