#!/bin/bash

# Check if memcached is installed
if ! command -v memcached &> /dev/null; then
    echo "Memcached not found. Installing via Homebrew..."
    brew install memcached
fi

brew services start memcached
