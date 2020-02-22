# The Sway configuration file in ~/.config/sway/config calls this script.
# You should see changes to the status bar after saving this script.
# If not, do "killall swaybar" and $mod+Shift+c to reload the configuration.

# The abbreviated weekday (e.g., "Sat"), followed by the ISO-formatted date
# like 2018-10-06 and the time (e.g., 14:01)
date_formatted=$(date "+%a %F %H:%M")
bat0=$(acpi -b | awk '{print $4}' | cut -d % -f 1 | head -n 1)
bat1=$(acpi -b | awk '{print $4}' | cut -d % -f 1 | tail -n 1)
volume=$(pactl list sinks | grep '^[[:space:]]Volume:' |
  head -n $(($SINK + 1)) | tail -n 1 | sed -e 's,.* \([0-9][0-9]*\)%.*,\1,')
# Emojis and characters for the status bar
echo " $bat0 |  $bat1 |   $date_formatted "
