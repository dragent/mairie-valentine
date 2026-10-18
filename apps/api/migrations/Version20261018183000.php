<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * A failed Discord sync must not keep granting the last known position.
 * Existing accounts stay confirmed until that failure is observed.
 */
final class Version20261018183000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Record whether the stored town hall position still grants roles.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE users ADD job_confirmed TINYINT(1) DEFAULT 1 NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE users DROP job_confirmed');
    }
}
