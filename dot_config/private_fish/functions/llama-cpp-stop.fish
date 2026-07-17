function llama-cpp-stop --description "Stop the llama-server launchd agent (until next login or llama-cpp-start)"
    launchctl bootout gui/(id -u)/com.joelazar.llama-server
    and echo "llama-server stopped"
end
