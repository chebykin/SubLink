.PHONY: backend frontend mock-a mock-b test-api-key reset-backend-db

backend:
	bun run backend:dev

frontend:
	bun run dev:frontend

mock-a:
	bun run dev:mock-a

mock-b:
	bun run dev:mock-b

test-api-key:
	bun run ops/test-api-key.ts

reset-backend-db:
	@set -a; [ -f .env ] && . ./.env; set +a; \
	DB_PATH="$${DB_PATH:-backend/data/sublink.db}"; \
	echo "Resetting backend DB at $$DB_PATH"; \
	rm -f "$$DB_PATH" "$$DB_PATH-wal" "$$DB_PATH-shm"
