function llama-cpp-start --description "Start the llama-server launchd agent"
    launchctl bootstrap gui/(id -u) ~/Library/LaunchAgents/com.joelazar.llama-server.plist
    and echo "llama-server started (http://127.0.0.1:11434)"
end
