# VeteranFinder Makefile
# For Linux, macOS, and WSL users.

.PHONY: help setup dev-up dev-down api web admin typecheck lint build db-migrate db-seed db-reset clean

help:
	@echo "VeteranFinder Commands:"
	@echo ""
	@echo "  make setup      - Install app dependencies and prepare the database"
	@echo "  make dev-up     - Start local infrastructure (postgres, redis, mailpit, coturn)"
	@echo "  make dev-down   - Stop local infrastructure"
	@echo "  make api        - Run the API server"
	@echo "  make web        - Run the web app"
	@echo "  make admin      - Run the admin app"
	@echo "  make typecheck  - Run TypeScript checks for all apps"
	@echo "  make lint       - Run linting for all apps"
	@echo "  make build      - Build all apps"
	@echo "  make db-migrate - Run database migrations"
	@echo "  make db-seed    - Seed database data"
	@echo "  make db-reset   - Reset the database (destructive)"
	@echo "  make clean      - Remove build artifacts and local dependencies"

dev-up:
	docker-compose up -d

dev-down:
	docker-compose down

setup: dev-up
	@echo "Installing API dependencies..."
	cd apps/api && npm install
	@echo "Installing web dependencies..."
	cd apps/web && npm install
	@echo "Installing admin dependencies..."
	cd apps/admin && npm install
	@echo "Preparing database..."
	cd apps/api && npx prisma generate
	cd apps/api && npx prisma migrate dev --name init
	cd apps/api && npx prisma db seed
	@echo ""
	@echo "Setup complete. Run these in separate terminals:"
	@echo "  make api"
	@echo "  make web"
	@echo "  make admin"

api:
	cd apps/api && npm run dev

web:
	cd apps/web && npm run dev

admin:
	cd apps/admin && npm run dev

typecheck:
	npm run typecheck

lint:
	npm run lint

build:
	npm run build

db-migrate:
	cd apps/api && npx prisma migrate dev

db-seed:
	cd apps/api && npx prisma db seed

db-reset:
	cd apps/api && npx prisma migrate reset --force

clean:
	rm -rf apps/api/node_modules apps/api/dist
	rm -rf apps/web/node_modules apps/web/.next
	rm -rf apps/admin/node_modules apps/admin/.next
	docker-compose down -v
