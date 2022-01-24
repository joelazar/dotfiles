function record-screen --description "record-screen <window|focused-output|zone, using it a second time will end the recording"
    if pgrep -f wf-recorder >/dev/null
        killall -s SIGINT wf-recorder
        pkill -RTMIN+9 waybar
        notify-send "Video saved" "Path copied to buffer"
        return 0
    else
        for option in $argv
            switch "$option"
                case window
                    set -l GEOM (swaymsg -t get_tree | jq -r '.. | select(.pid? and .visible?) | .rect | "\(.x),\(.y) \(.width)x\(.height)"' | slurp -d)

                    if not test -n "$GEOM"
                        return 1
                    end

                    wf-recorder -g $GEOM & pkill -RTMIN+9 waybar
                case focused-output
                    set -l GEOM (swaymsg -t get_outputs | jq -r '.[] | select(.focused) | .name')

                    if not test -n "$GEOM"
                        return 1
                    end

                    wf-recorder -o $GEOM & pkill -RTMIN+9 waybar
                case zone
                    set -l GEOM (slurp -d)

                    if not test -n "$GEOM"
                        return 1
                    end

                    wf-recorder -g $GEOM & pkill -RTMIN+9 waybar
            end
        end
    end
end
