#!/bin/sh

external_menu() {
	# use bemenu instead of dmenu
	bemenu -p yt-fzf -l 20 "$1"
}

# use mpv as video player
video_player() {
	# check if detach is enabled
	case "$is_detach" in
	# disabled
	0) /usr/bin/mpv --no-resume-playback "$@" ;;
	# enabled
	1) setsid -f /usr/bin/mpv --no-resume-playback "$@" >/dev/null 2>&1 ;;
	esac
}
