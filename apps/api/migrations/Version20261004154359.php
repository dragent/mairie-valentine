<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261004154359 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add the town hall position held by a user.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE users ADD job VARCHAR(16) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE users DROP job');
    }
}
