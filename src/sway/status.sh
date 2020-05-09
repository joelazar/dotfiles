# The Sway configuration file in ~/.config/sway/config calls this script.
# You should see changes to the status bar after saving this script.
# If not, do "killall swaybar" and $mod+Shift+c to reload the configuration.

# Keyboard input name
keyboard_input_name="1:1:AT_Translated_Set_2_keyboard"

# Battery or charger
battery0_charge=$(acpi -b | awk '{print $4}' | cut -d , -f 1 | head -n 1)
battery0_status=$(acpi -b | awk '{print $3}' | cut -d , -f 1 | head -n 1)
battery1_charge=$(acpi -b | awk '{print $4}' | cut -d , -f 1 | tail -n 1)
battery1_status=$(acpi -b | awk '{print $3}' | cut -d , -f 1 | tail -n 1)

# Audio and multimedia
audio_volume=$(pamixer --sink @DEFAULT_SINK@ --get-volume-human)
audio_is_muted=$(pamixer --sink @DEFAULT_SINK@ --get-mute)

# Network
ipaddress=$(ifconfig wlp3s0 | grep inet | head -n 1 | awk '{print $2}')

if ifconfig wg0 | grep -q inet; then
  vpn=''
else
  vpn=''
fi

if [ -z "$(ps ax | grep "[b]luetoothd")" ]; then
  bluetooth=''
else
  bluetooth=''
fi

# Others
language=$(swaymsg -r -t get_inputs | awk '/$keyboard_input_name/;/xkb_active_layout_name/' | grep "xkb_active_layout_name" | awk -F '"' '{print $4}' | sed -n 2p)
loadavg_5min=$(cat /proc/loadavg | awk -F ' ' '{print $2}')

if [ "$battery0_status" = "Discharging" ]; then
  battery0_pluggedin=''
else
  battery0_pluggedin=''
fi

if [ "$battery1_status" = "Discharging" ]; then
  battery1_pluggedin=''
else
  battery1_pluggedin=''
fi

if [ "$audio_is_muted" = "true" ]; then
  audio_active='婢'
else
  audio_active='墳'
fi

date_formatted=$(date "+%a %F %H:%M")

# Emojis and characters for the status bar
echo " $loadavg_5min | $bluetooth | $vpn |  $ipaddress | $battery0_pluggedin $battery0_charge | $battery1_pluggedin $battery1_charge | $audio_active $audio_volume | $language |  $date_formatted "
