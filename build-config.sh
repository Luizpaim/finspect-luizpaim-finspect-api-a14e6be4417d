#!/bin/bash -e

# Flush environment to docker
env | grep -e "MONGO_URL" -e "SENDGRID_API_KEY" -e "JWT_SECRET" > .env

# Get gcloud keys
echo $GOOGLE_API_KEYFILE | base64 --decode --ignore-garbage > gcloud-api-key.json

# Login on the registry
docker login -u _json_key -p "$(cat gcloud-api-key.json)" https://gcr.io