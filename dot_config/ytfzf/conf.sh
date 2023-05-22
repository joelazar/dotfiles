#!/bin/sh

external_menu() {
	# use bemenu instead of dmenu
	bemenu -p yt-fzf -l 20 "$1"
}
