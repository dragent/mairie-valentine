<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * A published decree now covers a chosen period. The old publication timestamp
 * becomes that period's first and last day, so nothing already on the board
 * disappears.
 */
final class Version20261007181623 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Replace a decree publication timestamp with a chosen start and end.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE decrees ADD ends_at DATETIME DEFAULT NULL, CHANGE published_at starts_at DATETIME DEFAULT NULL');
        $this->addSql('UPDATE decrees SET ends_at = starts_at WHERE starts_at IS NOT NULL AND ends_at IS NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE decrees ADD published_at DATETIME DEFAULT NULL');
        $this->addSql('UPDATE decrees SET published_at = starts_at');
        $this->addSql('ALTER TABLE decrees DROP starts_at, DROP ends_at');
    }
}
