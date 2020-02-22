# The Sway configuration file in ~/.config/sway/config calls this script.
# You should see changes to the status bar after saving this script.
# If not, do "killall swaybar" and $mod+Shift+c to reload the configuration.

# Keyboard input name
keyboard_input_name="1:1:AT_Translated_Set_2_keyboard"

# Battery or charger
battery0_charge=$(acpi -b | awk '{print $3}' | cut -d , -f 1 | head -n 1)
battery0_status=$(acpi -b | awk '{print $4}' | cut -d % -f 1 | head -n 1)
battery1_charge=$(acpi -b | awk '{print $3}' | cut -d , -f 1 | tail -n 1)
battery1_status=$(acpi -b | awk '{print $4}' | cut -d % -f 1 | tail -n 1)

# Audio and multimedia
sink_id=$(pactl list sinks short | grep IDLE | awk '{print $1}')
audio_volume=$(pamixer --sink $sink_id --get-volume)
audio_is_muted=$(pamixer --sink $sink_id --get-mute)

# Network
ipaddress=$(ifconfig wlp3s0 | grep inet | head -n 1 | awk '{print $2}')

# Others
language=$(swaymsg -r -t get_inputs | awk '/$keyboard_input_name/;/xkb_active_layout_name/' | grep -A1 '\b$keyboard_input_name\b' | grep "xkb_active_layout_name" | awk -F '"' '{print $4}')
loadavg_5min=$(cat /proc/loadavg | awk -F ' ' '{print $2}')

if [ $battery0_status = "Discharging" ]; then
  battery0_pluggedin='⚠'
else
  battery0_pluggedin='⚡'
fi

if [ $battery1_status = "Discharging" ]; then
  battery1_pluggedin='⚠'
else
  battery1_pluggedin='⚡'
fi

if [ $audio_is_muted = "true" ]; then
  audio_active='🔇'
else
  audio_active='🔊'
fi

date_formatted=$(date "+%a %F %H:%M")

# Emojis and characters for the status bar
echo "$loadavg_5min | ⇆ $ipaddress | $battery0_pluggedin $bat0 | $battery1_pluggedin $bat1 | $audio_active $audio_volume | $language |  $date_formatted "
