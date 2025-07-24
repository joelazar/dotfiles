function __tv_cable_options
    # List all .toml files in the cable directory and strip the .toml extension
    for file in (find ~/.config/television/cable -name "*.toml" -type f 2>/dev/null)
        basename $file .toml
    end
end

complete --command tv --no-files --arguments "(__tv_cable_options)" --description "Cable options"

