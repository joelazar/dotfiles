function llama-cpp-status --description "Show llama-server agent and API status"
    set -l state (launchctl print gui/(id -u)/com.joelazar.llama-server 2>/dev/null | string match -r 'state = \S+' | head -1)
    if test -n "$state"
        echo "agent: $state"
    else
        echo "agent: not loaded"
        return 1
    end

    set -l health (curl -s --max-time 2 http://127.0.0.1:11434/health)
    if string match -q '*"ok"*' $health
        echo "api:   up — "(curl -s --max-time 2 http://127.0.0.1:11434/v1/models | jq -r '.data[].id' | string join ', ')
    else if test -n "$health"
        echo "api:   $health"
    else
        echo "api:   not responding"
    end
end
