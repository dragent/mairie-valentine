<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * An event poster is stored as a file; only its public path is kept on the row.
 */
final class Version20261007170043 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Keep the public path of an event poster.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE municipal_events ADD poster_path VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE municipal_events DROP poster_path');
    }
}
