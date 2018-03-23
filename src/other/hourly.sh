/usr/bin/bing-wallpaper en-US false

if [[ $? -ne 0 ]]; then
  unset http_proxy
  unset https_proxy
  unset HTTP_PROXY
  unset HTTPS_PROXY
  /usr/bin/bing-wallpaper en-US false
fi
