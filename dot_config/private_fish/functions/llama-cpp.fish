function llama-cpp --description "Manage the llama-server launchd agent: start|stop|restart|status|logs"
    set -l svc gui/(id -u)/com.joelazar.llama-server
    switch "$argv[1]"
        case start
            if launchctl print $svc &>/dev/null
                echo "llama-server already running (http://127.0.0.1:8080)"
                return 0
            end
            launchctl bootstrap gui/(id -u) ~/Library/LaunchAgents/com.joelazar.llama-server.plist
            and echo "llama-server started (http://127.0.0.1:8080)"
        case stop
            launchctl bootout $svc
            and echo "llama-server stopped"
        case restart
            launchctl kickstart -k $svc
            and echo "llama-server restarted"
        case logs
            tail -f /tmp/com.joelazar.llama-server.out /tmp/com.joelazar.llama-server.err
        case status
            set -l state (launchctl print $svc 2>/dev/null | string match -r 'state = \S+' | head -1)
            if test -z "$state"
                echo "agent: not loaded"
                return 1
            end
            echo "agent: $state"
            set -l health (curl -s --max-time 2 http://127.0.0.1:8080/health)
            if string match -q '*"ok"*' $health
                echo "api:   up — "(curl -s --max-time 2 http://127.0.0.1:8080/v1/models | jq -r '.data[].id' | string join ', ')
            else if test -n "$health"
                echo "api:   $health"
            else
                echo "api:   not responding"
            end
        case '*'
            echo "Usage: llama-cpp start|stop|restart|status|logs"
            return 1
    end
end
