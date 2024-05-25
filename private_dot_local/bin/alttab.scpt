tell application "Terminal"
	do script "screen -dmS AltTab /Applications/AltTab.app/Contents/MacOS/AltTab && exit"
  delay 1.5
  if it is running then quit
end tell
