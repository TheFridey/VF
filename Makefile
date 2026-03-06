# VeteranFinder Makefile
# For Linux/Mac/WSL users

.PHONY: help setup dev dev-up dev-down api web db-migrate db-seed db-reset clean

help:
	@echo "VeteranFinder Commands:"
	@echo ""
	@echo "  make setup     - Install dependencies and setup database"
	@echo "  make dev-up    - Start infrastructure (postgres, redis, minio, mailpit)"
	@echo "  make dev-down  - Stop infrastructure"
	@echo "  make api       - Run API server"
	@echo "  make web       - Run Web server"
	@echo "  make db-migrate - Run database migrations"
	@echo "  make db-seed   - Seed database with test data"
	@echo "  make db-reset  - Reset database (destructive)"
	@echo "  make clean     - Remove node_modules and build artifacts"

# Start infrastructure
dev-up:
	docker-compose up -d

# Stop infrastructure
dev-down:
	docker-compose down

# Full setup
setup: dev-up
	@echo "Installing API dependencies..."
	cd apps/api && npm install --legacy-peer-deps
	@echo "Installing Web dependencies..."
	cd apps/web && npm install --legacy-peer-deps
	@echo "Setting up database..."
	cd apps/api && npx prisma generate
	cd apps/api && npx prisma migrate dev --name init
	cd apps/api && npx prisma db seed
	@echo ""
	@echo "Setup complete! Run these commands in separate terminals:"
	@echo "  make api    - Start API server"
	@echo "  make web    - Start Web server"

# Run API
api:
	cd apps/api && npm run dev

# Run Web
web:
	cd apps/web && npm run dev

# Database commands
db-migrate:
	cd apps/api && npx prisma migrate dev

db-seed:
	cd apps/api && npx prisma db seed

db-reset:
	cd apps/api && npx prisma migrate reset --force

db-studio:
	cd apps/api && npx prisma studio

# Clean
clean:
	rm -rf apps/api/node_modules apps/api/dist
	rm -rf apps/web/node_modules apps/web/.next
	docker-compose down -v
