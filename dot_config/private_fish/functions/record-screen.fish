function record-screen --description "record-screen <window|focused-output|zone, using it a second time will end the recording"
    if pgrep -f wf-recorder >/dev/null
        killall -s SIGINT wf-recorder
        pkill -RTMIN+9 waybar
        notify-send "Video saved"
        return 0
    else
		set -l name (date +%Y-%m-%d_%H-%M-%S)

		# choose one of the available options: window, focused-output, zone with fzf
		set -l argv (echo -e "window\nfocused-output\nzone" | fzf --prompt "Record: " --preview "echo -e {1}" --preview-window=up:3:wrap --height 30% --border)

        for option in $argv
            switch "$option"
                case window
                    set -l GEOM (swaymsg -t get_tree | jq -r '.. | select(.pid? and .visible?) | .rect | "\(.x),\(.y) \(.width)x\(.height)"' | slurp -d)

                    if not test -n "$GEOM"
                        return 1
                    end

                    wf-recorder -f ~/Downloads/$name.mp4 -g $GEOM & pkill -RTMIN+9 waybar
                case focused-output
                    set -l GEOM (swaymsg -t get_outputs | jq -r '.[] | select(.focused) | .name')

                    if not test -n "$GEOM"
                        return 1
                    end

                    wf-recorder -f ~/Downloads/$name.mp4 -o $GEOM & pkill -RTMIN+9 waybar
                case zone
                    set -l GEOM (slurp -d)

                    if not test -n "$GEOM"
                        return 1
                    end

                    wf-recorder -f ~/Downloads/$name.mp4 -g $GEOM & pkill -RTMIN+9 waybar
                case '*'
                    echo "Option ("$option") does not exists."
            end
        end
    end
end
