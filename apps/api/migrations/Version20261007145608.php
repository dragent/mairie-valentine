<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Desk memos can be filed in the archive without deleting them.
 */
final class Version20261007145608 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Keep a current/archived status on town hall notes.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE notes ADD status VARCHAR(16) DEFAULT 'current' NOT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE notes DROP status');
    }
}
