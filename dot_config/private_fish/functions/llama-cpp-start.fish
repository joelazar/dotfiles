function llama-cpp-start --description "Start the llama-server launchd agent"
    if launchctl print gui/(id -u)/com.joelazar.llama-server &>/dev/null
        echo "llama-server already running (http://127.0.0.1:11434)"
        return 0
    end
    launchctl bootstrap gui/(id -u) ~/Library/LaunchAgents/com.joelazar.llama-server.plist
    and echo "llama-server started (http://127.0.0.1:11434)"
end
