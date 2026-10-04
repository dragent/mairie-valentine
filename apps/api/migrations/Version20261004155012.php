<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261004155012 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create the town hall workspace: appointments, events, notes and decrees.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE appointments (id INT AUTO_INCREMENT NOT NULL, subject VARCHAR(180) NOT NULL, citizen_name VARCHAR(120) NOT NULL, scheduled_at DATETIME NOT NULL, duration_minutes INT NOT NULL, location VARCHAR(180) DEFAULT NULL, status VARCHAR(16) NOT NULL, notes LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, author_id INT DEFAULT NULL, INDEX IDX_6A41727AF675F31B (author_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE decrees (id INT AUTO_INCREMENT NOT NULL, reference VARCHAR(32) NOT NULL, title VARCHAR(180) NOT NULL, body LONGTEXT NOT NULL, status VARCHAR(16) NOT NULL, published_at DATETIME DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, author_id INT DEFAULT NULL, UNIQUE INDEX UNIQ_3A92FA44AEA34913 (reference), INDEX IDX_3A92FA44F675F31B (author_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE municipal_events (id INT AUTO_INCREMENT NOT NULL, title VARCHAR(180) NOT NULL, description LONGTEXT DEFAULT NULL, starts_at DATETIME NOT NULL, ends_at DATETIME DEFAULT NULL, location VARCHAR(180) DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, author_id INT DEFAULT NULL, INDEX IDX_5ED336CAF675F31B (author_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE notes (id INT AUTO_INCREMENT NOT NULL, title VARCHAR(180) NOT NULL, body LONGTEXT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, author_id INT DEFAULT NULL, INDEX IDX_11BA68CF675F31B (author_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE appointments ADD CONSTRAINT FK_6A41727AF675F31B FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE decrees ADD CONSTRAINT FK_3A92FA44F675F31B FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE municipal_events ADD CONSTRAINT FK_5ED336CAF675F31B FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE notes ADD CONSTRAINT FK_11BA68CF675F31B FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE appointments DROP FOREIGN KEY FK_6A41727AF675F31B');
        $this->addSql('ALTER TABLE decrees DROP FOREIGN KEY FK_3A92FA44F675F31B');
        $this->addSql('ALTER TABLE municipal_events DROP FOREIGN KEY FK_5ED336CAF675F31B');
        $this->addSql('ALTER TABLE notes DROP FOREIGN KEY FK_11BA68CF675F31B');
        $this->addSql('DROP TABLE appointments');
        $this->addSql('DROP TABLE decrees');
        $this->addSql('DROP TABLE municipal_events');
        $this->addSql('DROP TABLE notes');
    }
}
