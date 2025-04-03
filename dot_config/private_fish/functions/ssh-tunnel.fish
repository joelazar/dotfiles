function ssh-tunnel
    # Description: Creates an SSH tunnel for connecting to a remote service and runs a specified client command
    #
    # Arguments:
    # $argv[1]: SSH host (e.g., user@ssh.example.com)
    # $argv[2]: Remote service host (e.g., postgres.internal or 10.0.0.5)
    # $argv[3]: Remote service port (e.g., 5432 for PostgreSQL, 6379 for Redis)
    # $argv[4]: Client command to run (e.g., "pgcli -h localhost -p PORT_PLACEHOLDER -U username -d dbname")
    #           Use PORT_PLACEHOLDER where the local port should be inserted
    #
    # Examples:
    # 1. PostgreSQL: ssh-tunnel user@jump.host db.internal 5432 "pgcli -h localhost -p PORT_PLACEHOLDER -U dbuser -d mydb"
    # 2. Redis: ssh-tunnel user@jump.host redis.internal 6379 "redis-cli -h localhost -p PORT_PLACEHOLDER --tls"
    # 3. MongoDB: ssh-tunnel user@jump.host mongo.internal 27017 "mongosh --port PORT_PLACEHOLDER"

    # --- Argument Handling ---
    if test (count $argv) -lt 4
        echo "Usage: ssh-tunnel <ssh_host> <remote_service_host> <remote_port> <client_command>"
        echo "Example: ssh-tunnel user@jump.host db.internal 5432 \"pgcli -h localhost -p PORT_PLACEHOLDER -U user -d dbname\""
        echo "Example: ssh-tunnel user@jump.host redis.internal 6379 \"redis-cli -h localhost -p PORT_PLACEHOLDER --tls\""
        return 1
    end

    set ssh_connection $argv[1]
    set remote_host $argv[2]
    set remote_port $argv[3]
    set client_command $argv[4]

    # Validate port is a number
    if not string match -q -r '^[0-9]+$' -- $remote_port
        echo "Error: Remote port '$remote_port' is not a valid number."
        return 1
    end

    # --- Tunnel Setup ---
    # Generate a random local port in the dynamic/private range
    set local_port (random 49152 65535)

    echo "Setting up SSH tunnel: localhost:$local_port -> $remote_host:$remote_port via $ssh_connection"

    # Start SSH tunnel in background
    ssh -fNT -L $local_port:$remote_host:$remote_port $ssh_connection

    # Basic check to see if the tunnel process started
    sleep 1 # Give SSH a moment
    set tunnel_pid (pgrep -f "ssh.*-L $local_port:$remote_host:$remote_port $ssh_connection")

    if test -z "$tunnel_pid"
        echo "Error: Failed to establish SSH tunnel process."
        return 1
    end
    echo "SSH tunnel process started (PID: $tunnel_pid). Connecting client..."

    # --- Connect client application ---
    # Replace PORT_PLACEHOLDER with the actual local port
    set client_command_with_port (string replace "PORT_PLACEHOLDER" $local_port $client_command)

    # Run the client command
    eval $client_command_with_port

    # --- Cleanup ---
    echo # Add a newline for clarity
    echo "Client exited. Closing SSH tunnel (PID: $tunnel_pid)..."

    # Find the tunnel PID again in case it has changed
    set current_tunnel_pid (pgrep -f "ssh.*-L $local_port:$remote_host:$remote_port $ssh_connection")

    if test -n "$current_tunnel_pid"
        kill $current_tunnel_pid
        # Wait briefly and check if it's gone
        sleep 0.5
        if pgrep -f "ssh.*-L $local_port:$remote_host:$remote_port $ssh_connection" >/dev/null
            echo "Warning: Tunnel process (PID: $current_tunnel_pid) might not have terminated cleanly."
        else
            echo "Tunnel closed."
        end
    else
        echo "Warning: Tunnel process for localhost:$local_port not found. It might have already exited."
    end
end
