function llama-cpp-restart --description "Restart the llama-server launchd agent"
    launchctl kickstart -k gui/(id -u)/com.joelazar.llama-server
    and echo "llama-server restarted"
end
