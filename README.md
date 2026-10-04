# Mairie de Valentine

Portail administratif de la ville de Valentine pour un serveur de jeu de rôle **RedM**.

| Composant  | Techno                                      | URL locale                        |
| ---------- | ------------------------------------------- | --------------------------------- |
| Front      | Next.js 16 (App Router, TypeScript, Tailwind 4) | http://localhost:3000         |
| API        | Symfony 7.4 LTS + API Platform 4            | http://localhost:8080/api/docs    |
| Base       | MySQL 8.4                                   | `localhost:3307`                  |
| Adminer    | profil `tools`                              | http://localhost:8081             |

L'authentification est déléguée à **Discord** (OAuth2) ; l'API ne stocke aucun
mot de passe et délivre un **JWT** signé par une paire de clés RSA.

## Démarrage

Prérequis : Docker Desktop. Rien d'autre n'a besoin d'être installé sur la machine.

```bash
cp .env.example .env     # puis renseigner APP_SECRET, JWT_PASSPHRASE et les identifiants Discord
docker compose up -d --build
```

Au premier démarrage, le conteneur `api` installe les dépendances Composer,
génère la paire de clés JWT et applique les migrations Doctrine.

Avec `make` : `make init` enchaîne ces étapes, `make help` liste le reste.

### Secrets à générer

```bash
openssl rand -hex 32   # APP_SECRET
openssl rand -hex 32   # JWT_PASSPHRASE
```

`JWT_PASSPHRASE` ne doit plus changer une fois les clés générées, sinon les clés
du volume `api_jwt` deviennent illisibles.

### Application Discord

Sur https://discord.com/developers/applications, onglet *OAuth2* :

1. Déclarer l'URL de redirection `http://localhost:8080/auth/discord/check`
   (en production : `${API_URL}/auth/discord/check`).
2. Reporter *Client ID* et *Client Secret* dans `DISCORD_CLIENT_ID` et
   `DISCORD_CLIENT_SECRET`.
3. Optionnel : renseigner `DISCORD_GUILD_ID` pour n'autoriser que les membres du
   serveur Discord de la ville.

## Organisation

```
apps/api            Symfony : API Platform, Doctrine, sécurité JWT
  src/Controller    /auth/discord, /api/me, /health
  src/Entity        User (compte adossé à un compte Discord)
  src/Security      Provisioning du compte et appels à l'API Discord
apps/web            Next.js : pages, composants, client HTTP
  src/lib/api.ts    Client fetch typé, résolution de l'URL de l'API
  src/lib/auth-*    Contexte d'authentification (JWT en localStorage)
docker/             Images PHP-FPM, nginx et Node
compose.yaml        Stack de développement (bind mounts, Xdebug, hot reload)
compose.prod.yaml   Surcouche de production (sources dans les images)
```

## Parcours de connexion

1. Le front envoie l'utilisateur sur `GET /auth/discord`.
2. Symfony le redirige vers Discord (scopes `identify`, `email`, `guilds`).
3. Discord revient sur `GET /auth/discord/check` : le compte local est créé ou
   mis à jour, puis un JWT est émis.
4. L'utilisateur est renvoyé sur `/auth/callback#token=…`. Le fragment n'est
   jamais transmis au serveur, donc le jeton n'apparaît dans aucun log d'accès.
5. Le front stocke le jeton et appelle `GET /api/me` avec
   `Authorization: Bearer <token>`.

## Rôles

Hiérarchie définie dans `apps/api/config/packages/security.yaml` :

`ROLE_USER` → `ROLE_AGENT` → `ROLE_ADJOINT` → `ROLE_MAIRE` → `ROLE_ADMIN`

Tout nouveau compte obtient `ROLE_USER`. Les autres rôles s'attribuent en base
(colonne `users.roles`).

## Commandes utiles

```bash
docker compose exec api php bin/console make:entity
docker compose exec api php bin/console make:migration
docker compose exec api php bin/console doctrine:migrations:migrate
docker compose exec web npm run lint
docker compose --profile tools up -d adminer
```

Xdebug est installé mais désactivé : passer `XDEBUG_MODE=debug` dans `.env` et
redémarrer le conteneur `api`.

## Production

```bash
docker compose -f compose.yaml -f compose.prod.yaml up -d --build
```

Les sources, les dépendances et le cache Symfony sont alors inclus dans les
images (tags `:prod`, distincts des images de développement). Penser à mettre
`APP_ENV=prod`, `APP_DEBUG=0`, `AUTO_MIGRATE=0`, à renseigner `API_URL` et
`FRONTEND_URL` avec les vrais domaines et à restreindre `CORS_ALLOW_ORIGIN`.
`NEXT_PUBLIC_API_URL` étant inliné au build, l'image front doit être
reconstruite si l'URL de l'API change.
