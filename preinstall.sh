#!/bin/bash

# Check if brew is installed
if ! command -v brew &> /dev/null; then
    echo "Homebrew not found. Please install it first."
    exit 0
fi

# Check if memcached is installed
if ! command -v memcached &> /dev/null; then
    echo "Memcached not found. Installing via Homebrew..."
    brew install memcached
fi

brew services start memcached
