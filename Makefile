COMPOSE      := docker compose
COMPOSE_PROD := docker compose -f compose.yaml -f compose.prod.yaml
API          := $(COMPOSE) exec api
WEB          := $(COMPOSE) exec web
CONSOLE      := $(API) php bin/console

.DEFAULT_GOAL := help
.PHONY: help init up down restart build logs ps sh sh-web console migration migrate db-reset lint tools prod-build prod-up prod-down

help: ## Liste les commandes disponibles
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

init: ## Première installation : .env, images, dépendances, base de données
	@test -f .env || cp .env.example .env
	$(COMPOSE) build
	$(COMPOSE) up -d
	$(CONSOLE) doctrine:database:create --if-not-exists
	$(CONSOLE) doctrine:migrations:migrate --allow-no-migration --no-interaction
	@echo "Front : http://localhost:3000 — API : http://localhost:8080/api/docs"

up: ## Démarre la stack
	$(COMPOSE) up -d

down: ## Arrête la stack
	$(COMPOSE) down

restart: ## Redémarre la stack
	$(COMPOSE) restart

build: ## Reconstruit les images
	$(COMPOSE) build --pull

logs: ## Suit les logs (make logs s=api)
	$(COMPOSE) logs -f $(s)

ps: ## État des conteneurs
	$(COMPOSE) ps

sh: ## Shell dans le conteneur PHP
	$(API) sh

sh-web: ## Shell dans le conteneur Next.js
	$(WEB) sh

console: ## Commande Symfony (make console c="debug:router")
	$(CONSOLE) $(c)

migration: ## Génère une migration à partir des entités
	$(CONSOLE) make:migration

migrate: ## Applique les migrations
	$(CONSOLE) doctrine:migrations:migrate --no-interaction

db-reset: ## Recrée la base de zéro
	$(CONSOLE) doctrine:database:drop --force --if-exists
	$(CONSOLE) doctrine:database:create
	$(CONSOLE) doctrine:migrations:migrate --allow-no-migration --no-interaction

lint: ## Vérifie la configuration Symfony et le front
	$(CONSOLE) lint:container
	$(CONSOLE) lint:yaml config
	$(WEB) npm run lint

prod-build: ## Construit les images de production
	$(COMPOSE_PROD) build --pull

prod-up: ## Démarre la stack de production
	$(COMPOSE_PROD) up -d

prod-down: ## Arrête la stack de production
	$(COMPOSE_PROD) down

tools: ## Démarre Adminer (http://localhost:8081)
	$(COMPOSE) --profile tools up -d adminer
