<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Anonymous tally of identity cards issued since the last mayors' meeting.
 */
final class Version20261102113407 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Record identity-card issuances without naming the holder.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE identity_cards (id INT AUTO_INCREMENT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, author_id INT DEFAULT NULL, INDEX IDX_EE99120DF675F31B (author_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE identity_cards ADD CONSTRAINT FK_EE99120DF675F31B FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE identity_cards DROP FOREIGN KEY FK_EE99120DF675F31B');
        $this->addSql('DROP TABLE identity_cards');
    }
}
