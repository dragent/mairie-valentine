<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * A decree poster is stored as a file; only its public path is kept on the row.
 */
final class Version20261007182229 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Keep the public path of a decree poster.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE decrees ADD poster_path VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE decrees DROP poster_path');
    }
}
