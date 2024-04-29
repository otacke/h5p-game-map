# This is only intended to be run in the CI environment! When run locally,
# we assume that we're running inside the H5P CLI environment.
if [ -n "$GITHUB_ACTIONS" ]; then

    # determine H5P CLI short name as H5P CLI would
    machineToShort() {
        local machineName=$1

        # Replace 'H5PEditor' with 'H5P-Editor'
        machineName=${machineName//H5PEditor/H5P-Editor}

        # Replace camelCase to kebab-case
        machineName=$(echo "$machineName" | sed 's/\([a-z]\)\([A-Z]\)/\1-\2/g')

        # Convert to lowercase and replace '.' with '-'
        machineName=$(echo "$machineName" | tr '[:upper:]' '[:lower:]' | tr '.' '-')

        echo "$machineName"
    }

    # npm doesn't serve the latest version yet
    git clone https://github.com/h5p/h5p-cli.git
    cd h5p-cli
    npm install
    cd ..
    npm install -g ./h5p-cli

    # Set up test server
    mkdir test-server
    cd test-server
    h5p core

    # Setup content type
    h5p setup $(machineToShort "$H5P_CLI_MACHINE_NAME")

    # Use regex pattern to match directory name
    CONTENT_TYPE_DIR=$(find libraries -type d -name "${H5P_CLI_MACHINE_NAME}-*" -print -quit)
    if [ -n "$CONTENT_TYPE_DIR" ]; then
        cd $CONTENT_TYPE_DIR
    else
        echo "Content type $H5P_CLI_MACHINE_NAME could not be set up properly."
        exit 1
    fi
fi
