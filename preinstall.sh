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

# Start memcached service
brew services start memcached

# Check if MongoDB Community is installed
if ! brew list | grep mongodb-community &> /dev/null; then
    echo "MongoDB Community not found. Installing via Homebrew..."
    brew tap mongodb/brew
    brew install mongodb-community
fi

# Start MongoDB Community service
brew services start mongodb/brew/mongodb-community
