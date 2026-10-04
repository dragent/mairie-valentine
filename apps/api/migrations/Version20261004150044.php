<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261004150044 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create the users table, backed by Discord accounts.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE users (id INT AUTO_INCREMENT NOT NULL, discord_id VARCHAR(32) NOT NULL, username VARCHAR(64) NOT NULL, display_name VARCHAR(64) DEFAULT NULL, email VARCHAR(255) DEFAULT NULL, avatar_url VARCHAR(255) DEFAULT NULL, roles JSON NOT NULL, created_at DATETIME NOT NULL, last_login_at DATETIME DEFAULT NULL, UNIQUE INDEX UNIQ_1483A5E943349DE (discord_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE users');
    }
}
