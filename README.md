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

### Bot Discord

Les fonctions à la mairie sont lues sur les rôles Discord, et réécrites là-bas
quand le maire promeut quelqu'un : il faut donc un bot.

1. Onglet *Bot* de l'application : créer le bot, copier son jeton dans
   `DISCORD_BOT_TOKEN`, activer l'intent privilégié *Server Members Intent*,
   puis l'inviter sur le serveur avec la permission *Gérer les rôles*. Sans
   cet intent, le maire ne peut pas lister les membres du serveur.
2. Dans les paramètres du serveur, placer le rôle du bot **au-dessus** de ceux
   de maire, adjoint et secrétaire : Discord refuse toute modification d'un rôle
   situé plus haut que le sien, et les promotions échoueraient.
3. Activer le mode développeur sur Discord, puis clic droit sur chaque rôle →
   *Copier l'identifiant*, et le reporter dans `DISCORD_ROLE_MAIRE`,
   `DISCORD_ROLE_ADJOINT` et `DISCORD_ROLE_SECRETAIRE`.

Tant que `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID` ou l'un des trois identifiants
de rôle est vide, la synchronisation est désactivée : la colonne `users.job` se
gère alors uniquement depuis le panel ou en base.

## Organisation

```
apps/api            Symfony : API Platform, Doctrine, sécurité JWT
  src/Controller    /auth/discord, /api/me, /health
  src/Dto           Charges utiles qui ne sont pas des entités
  src/Entity        User (compte adossé à un compte Discord)
  src/Enum          Job (fonction à la mairie)
  src/Security      Provisioning du compte et appels à l'API Discord
  src/Service       JobAssigner (promotions)
  src/State         Processeurs API Platform (promotion)
apps/web            Next.js : pages, composants, client HTTP
  src/app/personnel Recrutement et nominations
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
   mis à jour — sa fonction y compris, relue sur les rôles du serveur — puis un
   JWT est émis.
4. L'utilisateur est renvoyé sur `/auth/callback#token=…`. Le fragment n'est
   jamais transmis au serveur, donc le jeton n'apparaît dans aucun log d'accès.
5. Le front stocke le jeton et appelle `GET /api/me` avec
   `Authorization: Bearer <token>`.

## Fonctions et rôles

Trois fonctions se partagent la mairie, stockées dans `users.job` :

| Fonction       | Rôle accordé      | Accès                                                  |
| -------------- | ----------------- | ------------------------------------------------------ |
| Secrétaire     | `ROLE_SECRETAIRE` | Accès à l'espace de travail                            |
| Maire adjoint  | `ROLE_ELU`        | Idem, plus le recrutement des secrétaires              |
| Maire          | `ROLE_MAIRE`      | Idem, plus la nomination des adjoints et la cession    |

Hiérarchie définie dans `apps/api/config/packages/security.yaml` :

`ROLE_USER` → `ROLE_SECRETAIRE` → `ROLE_ELU` → `ROLE_MAIRE` → `ROLE_ADMIN`

Le maire et son adjoint ont les mêmes droits métier, portés par `ROLE_ELU`.
L'adjoint recrute les secrétaires ; `ROLE_MAIRE` réserve la nomination des
adjoints et la cession de la place.

La fonction est déduite des rôles Discord à chaque connexion. Depuis
`/personnel`, l'adjoint recrute les secrétaires parmi les membres du
serveur — y compris ceux qui n'ont pas encore ouvert le portail. Le maire y
nomme aussi les adjoints, ou cède sa place : le successeur devient l'unique
maire et l'ancien redevient citoyen. L'API accorde le nouveau rôle Discord et
retire l'ancien, et n'enregistre rien si Discord refuse.

`ROLE_ADMIN`, qu'aucune fonction n'accorde, reste attribuable à la main dans la
colonne `users.roles`.

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
