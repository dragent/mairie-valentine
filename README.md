# 🦅 Mairie de Valentine — Portail administratif

> *« Un maire peut être remplacé. Une ville peut changer de mains. Mais tant que ses habitants tiennent debout, Valentine demeure. »*
>
> **William Harrington — Maire de Valentine, 1889**

---

<p align="center">
  <strong>VALENTINE MUNICIPAL ADMINISTRATION</strong><br>
  <em>Administration • Organisation • Responsabilité</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Projet-RedM_RP-8B4513?style=flat-square" alt="Projet RedM RP">
  <img src="https://img.shields.io/badge/Frontend-Next.js_16-black?style=flat-square&logo=next.js" alt="Next.js 16">
  <img src="https://img.shields.io/badge/Backend-Symfony_7.4-000000?style=flat-square&logo=symfony" alt="Symfony 7.4">
  <img src="https://img.shields.io/badge/Database-MySQL_8.4-4479A1?style=flat-square&logo=mysql" alt="MySQL 8.4">
  <img src="https://img.shields.io/badge/Deployment-Docker-2496ED?style=flat-square&logo=docker" alt="Docker">
</p>

## Présentation

La mairie de Valentine dispose désormais d'un portail administratif conçu pour structurer la gestion municipale d'un serveur de jeu de rôle **RedM**, dans l'univers du Far West de 1889.

Ce projet a pour ambition de fournir aux élus et au personnel municipal un espace de travail centralisé, organisé autour de leurs responsabilités, de leurs fonctions et des besoins de la ville.

Derrière chaque décision se trouvent des responsabilités. Derrière chaque document, une trace. Et derrière chaque fonction, une obligation envers les habitants.

Le portail traduit ces principes en outils numériques modernes, sans perdre l'identité institutionnelle de Valentine.

## Fonctionnalités

### 🏛️ Administration municipale

- **Rendez-vous :** centralisation et suivi des rendez-vous municipaux.
- **Événements :** organisation et gestion des événements de la ville.
- **Notes internes :** conservation des informations nécessaires au fonctionnement de la mairie.
- **Décrets municipaux :** gestion des actes administratifs et attribution automatique de leurs références.
- **Gestion du personnel :** recrutement des secrétaires, nomination des adjoints et transmission de la fonction de maire.

### 🔐 Authentification et autorisations

L'authentification repose sur **Discord OAuth2**. Le portail ne stocke aucun mot de passe Discord et utilise des jetons JWT signés par une paire de clés RSA pour les sessions applicatives.

Les fonctions municipales sont synchronisées avec les rôles Discord configurés sur le serveur.

Les accès sont contrôlés côté API selon les responsabilités de chaque utilisateur. L'interface ne constitue donc pas, à elle seule, la barrière de sécurité.

### ⚙️ Organisation des fonctions

| Fonction | Responsabilités principales |
| --- | --- |
| Secrétaire | Gestion de l'espace de travail municipal |
| Maire adjoint | Administration courante et recrutement des secrétaires |
| Maire | Responsabilités des élus, nominations et transmission de la fonction |
| Administrateur | Privilèges techniques attribués séparément |

Les autorisations effectives sont définies par la configuration de sécurité du backend. Les opérations impliquant Discord nécessitent également les permissions correspondantes du bot.

## Architecture technique

Le projet adopte une architecture séparant l'interface utilisateur, la logique métier et la persistance des données.

| Composant | Technologie |
| --- | --- |
| Frontend | Next.js 16, App Router, TypeScript |
| Interface | Tailwind CSS 4 |
| Backend | Symfony 7.4 LTS |
| API | API Platform 4 |
| ORM et migrations | Doctrine |
| Base de données | MySQL 8.4 |
| Authentification | Discord OAuth2 et JWT RSA |
| Conteneurisation | Docker Compose |
| Administration BDD | Adminer, profil optionnel `tools` |

### Organisation du dépôt

```text
mairie-valentine/
├── apps/
│   ├── web/                 # Interface Next.js
│   │   └── src/
│   │       ├── app/         # Pages et espaces municipaux
│   │       └── lib/         # Client API et authentification
│   └── api/                 # Backend Symfony
│       ├── src/
│       │   ├── Controller/
│       │   ├── Dto/
│       │   ├── Entity/
│       │   ├── Enum/
│       │   ├── Security/
│       │   ├── Service/
│       │   └── State/
│       └── config/
├── docker/                  # Images et configurations
├── compose.yaml             # Environnement de développement
├── compose.prod.yaml        # Configuration de production
├── Makefile                 # Commandes courantes
└── .env.example             # Modèle de configuration
```

## Installation

### Prérequis

- Docker Desktop ou Docker Engine avec Docker Compose.
- Une application Discord configurée pour OAuth2.
- Un bot Discord disposant des permissions nécessaires à la synchronisation des rôles.

Les dépendances applicatives sont installées dans les conteneurs.

### 1. Récupérer le projet

```bash
git clone https://github.com/dragent/mairie-valentine.git
cd mairie-valentine
```

### 2. Configurer l'environnement

```bash
cp .env.example .env
```

Renseignez les variables nécessaires, notamment :

- `APP_SECRET`
- `JWT_PASSPHRASE`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- Les identifiants des rôles Discord
- Les URL de l'API et du frontend, selon l'environnement

Générez les secrets applicatifs avec :

```bash
openssl rand -hex 32
```

**Attention :** ne modifiez pas `JWT_PASSPHRASE` après la génération des clés JWT sans prévoir une procédure de rotation des clés et des sessions.

Ne publiez jamais le fichier `.env`, les jetons du bot ou les clés privées dans le dépôt.

Ces valeurs vivent uniquement dans le `.env` de la machine, ou dans les variables du serveur. `apps/api/.env` et `apps/api/.env.dev` restent des modèles vides. Un `APP_SECRET` a déjà été publié dans l'historique de `.env.dev` : considérez-le comme brûlé, et remplacez-le partout où il aurait été recopié. Supprimer la ligne ne l'efface pas des anciens commits. Les clés JWT (`config/jwt/*.pem`) ne sont pas versionnées ; si une copie a circulé hors du dépôt, régénérez la paire et changez `JWT_PASSPHRASE`. Le frontend ne reçoit que `NEXT_PUBLIC_API_URL`.

### 3. Démarrer l'application

```bash
docker compose up -d --build
```

Ou, si la commande est disponible dans le Makefile :

```bash
make init
```

### 4. Accéder aux services

| Service | Adresse locale |
| --- | --- |
| Portail municipal | http://localhost:3000 |
| Documentation de l'API | http://localhost:8080/api/docs |
| Base de données | `localhost:3307` |
| Adminer, si activé | http://localhost:8081 |

Les ports et variables peuvent être adaptés à la configuration de l'environnement.

## Configuration Discord

Dans le [portail développeur Discord](https://discord.com/developers/applications) :

1. Configurez l'URL de redirection OAuth2 : `http://localhost:8080/auth/discord/check`.
2. Renseignez le Client ID et le Client Secret dans `.env`.
3. Créez le bot et configurez son jeton.
4. Activez l'intention privilégiée **Server Members Intent**.
5. Attribuez au bot les permissions requises pour gérer les rôles.
6. Placez son rôle au-dessus des rôles municipaux qu'il doit modifier.
7. Renseignez les identifiants des rôles de maire, de maire adjoint et de secrétaire.

En production, remplacez les URL locales par les domaines réels et configurez correctement les URL de redirection OAuth2.

Sans configuration Discord complète, la synchronisation des fonctions municipales reste désactivée.

## Sécurité et contrôle des accès

Le projet applique plusieurs principes de sécurité :

- Authentification déléguée à Discord.
- Jetons JWT signés par une paire de clés RSA.
- Contrôle des autorisations au niveau de l'API.
- Attribution des fonctions selon les rôles Discord.
- Attribution des auteurs et des dates par le backend.
- Configuration séparée des environnements de développement et de production.

La mise en production doit également prévoir des secrets robustes, HTTPS, une configuration CORS restrictive, des sauvegardes de base de données et une gestion rigoureuse des accès au serveur.

## Développement

### Commandes utiles

```bash
# Consulter les commandes disponibles
make help

# Exécuter les migrations Doctrine
docker compose exec api php bin/console doctrine:migrations:migrate

# Lancer le lint du frontend
docker compose exec web npm run lint

# Activer Adminer
docker compose --profile tools up -d adminer
```

Pour le débogage PHP, Xdebug est disponible et peut être activé via `XDEBUG_MODE=debug` dans `.env`.

### Déploiement en production

```bash
docker compose \
  -f compose.yaml \
  -f compose.prod.yaml \
  up -d --build
```

Avant le déploiement, configurez notamment `APP_ENV=prod`, `APP_DEBUG=0`, `AUTO_MIGRATE=0`, `API_URL`, `FRONTEND_URL` et `CORS_ALLOW_ORIGIN`.

La variable `NEXT_PUBLIC_API_URL` étant intégrée au frontend lors du build, toute modification de l'URL de l'API nécessite de reconstruire l'image concernée.

Les affiches d'événements et de décrets sont écrites par PHP dans `public/uploads` et servies par Nginx. En production, ce répertoire correspond au volume `api_uploads`, monté dans les deux conteneurs : une affiche déposée reste visible après un redémarrage ou une reconstruction. Ne supprimez pas ce volume, ni `api_jwt`, avec `docker compose down -v`.

## Sauvegardes

```bash
sh apps/api/bin/backup-database.sh
sh apps/api/bin/restore-database.sh backups/mairie-YYYYMMDDTHHMMSSZ.sql
```

Le mot de passe reste celui du conteneur `db` ; il n'est pas écrit dans le script. Les dumps vont dans `backups/`, qui n'est pas versionné. Après une restauration, vérifier les tables :

```bash
docker compose exec db sh -c 'mysql -N -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SHOW TABLES"'
```

## Philosophie du projet

La mairie n'est pas seulement un bâtiment, un titre ou un bureau. Elle est le point de rencontre entre les institutions, les entreprises et les citoyens.

Ce portail a été conçu pour accompagner cette vision : structurer le travail municipal, clarifier les responsabilités et préserver la continuité administrative de Valentine.

Le code évolue. Les fonctions changent de mains. Les mandats prennent fin.

Mais une administration bien organisée doit pouvoir continuer à servir la ville, quel que soit le nom inscrit sur la porte du maire.

> *« On ne juge pas un homme à la durée de son mandat, mais à ce qu'il laisse derrière lui. »*
>
> **William Harrington**

---

## Auteur

**Dragent** — Développement et conception du portail administratif.

Projet destiné à un usage roleplay sur serveur RedM. Les références à la mairie de Valentine, à William Harrington et à l'année 1889 appartiennent à l'univers fictionnel du serveur.

**Dépôt :** [github.com/dragent/mairie-valentine](https://github.com/dragent/mairie-valentine)
