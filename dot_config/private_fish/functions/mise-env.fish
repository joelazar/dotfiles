function mise-env --description 'Switch MISE_ENV between production, staging, or unset'
    switch (count $argv)
        case 0
            if set -q MISE_ENV
                echo "MISE_ENV=$MISE_ENV"
            else
                echo "MISE_ENV is not set"
            end
            return
    end

    switch $argv[1]
        case prod production
            set -gx MISE_ENV production
            set -gx MISE_ENV_DISPLAY "🚨 production"
            echo "MISE_ENV=production"
        case staging
            set -gx MISE_ENV staging
            set -gx MISE_ENV_DISPLAY "🧪 staging"
            echo "MISE_ENV=staging"
        case off none unset
            set -e MISE_ENV
            set -e MISE_ENV_DISPLAY
            echo "MISE_ENV unset"
        case '*'
            echo "Usage: mise-env [production|staging|off]"
            return 1
    end
end
