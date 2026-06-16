# Containerization

Anggor runs with all permissions by default. For stronger isolation, run it inside a container.

## Plain Docker

Build and run Anggor in a Docker container:

```bash
# Build the image
docker build -t anggor -f Dockerfile.anggor .

# Run with API key
docker run --rm -it \
  -e OPENAI_API_KEY \
  -v "$PWD:/workspace" \
  anggor "fix all lint errors"

# Interactive mode
docker run --rm -it \
  -e OPENAI_API_KEY \
  -v "$PWD:/workspace" \
  anggor
```

## Docker Compose

For easier setup with environment variables:

1. Create a `.env` file with your API keys:

```bash
OPENAI_API_KEY=sk-...
```

2. Run with Docker Compose:

```bash
# Interactive mode
docker-compose run --rm anggor

# One-shot mode
docker-compose run --rm anggor "fix all lint errors"

# With specific provider
docker-compose run --rm -e ANTHROPIC_API_KEY=sk-... anggor
```

## Environment Variables

Pass API keys as environment variables:

```bash
docker run --rm -it \
  -e OPENAI_API_KEY=sk-... \
  -e ANTHROPIC_API_KEY=sk-... \
  -v "$PWD:/workspace" \
  anggor
```

Or use a `.env` file:

```bash
docker run --rm -it \
  --env-file .env \
  -v "$PWD:/workspace" \
  anggor
```

## Volume Mounts

- `-v "$PWD:/workspace"` — Mount current directory as workspace
- `-v anggor-home:/root/.anggor` — Persistent Anggor config and sessions

## Security Notes

- API keys are passed as environment variables and are available inside the container
- For stronger isolation, use Docker secrets or a secrets manager
- The container runs as root by default; use `--user` flag to run as non-root

## Troubleshooting

### Permission Issues

If you encounter permission issues with mounted volumes:

```bash
docker run --rm -it \
  --user "$(id -u):$(id -g)" \
  -e OPENAI_API_KEY \
  -v "$PWD:/workspace" \
  anggor
```

### Network Issues

If the container can't reach external APIs:

```bash
docker run --rm -it \
  --network host \
  -e OPENAI_API_KEY \
  -v "$PWD:/workspace" \
  anggor
```
