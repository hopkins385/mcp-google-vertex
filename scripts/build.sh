#!/bin/bash

# Exit on any error
set -e

# Configuration
IMAGE_NAME="mcp-google-vertex"
TAG="latest"
DOCKERFILE="Dockerfile"
PLATFORM="linux/amd64"

# Print status
echo "Building $IMAGE_NAME:$TAG..."

# Build with cache optimizations and platform specification
docker build \
  --tag "$IMAGE_NAME:$TAG" \
  --file "$DOCKERFILE" \
  --platform "$PLATFORM" \
  .

echo "Build successful! Image: $IMAGE_NAME:$TAG"