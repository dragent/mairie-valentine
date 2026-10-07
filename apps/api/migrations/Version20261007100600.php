<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Accounts bootstrapped by hand kept the position in the extra-roles column
 * and left the job empty, so the register called a mayor a citizen.
 */
final class Version20261007100600 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Record the town hall position for accounts that only stored it as a role.';
    }

    public function up(Schema $schema): void
    {
        $positions = [
            'ROLE_MAIRE' => 'maire',
            'ROLE_ELU' => 'adjoint',
            'ROLE_SECRETAIRE' => 'secretaire',
        ];

        $rows = $this->connection->fetchAllAssociative('SELECT id, roles FROM users WHERE job IS NULL');

        foreach ($rows as $row) {
            $roles = json_decode((string) $row['roles'], true);

            if (!\is_array($roles)) {
                continue;
            }

            $job = null;

            foreach ($positions as $role => $value) {
                if (\in_array($role, $roles, true)) {
                    $job = $value;
                    break;
                }
            }

            if (null === $job) {
                continue;
            }

            $roles = array_values(array_filter(
                $roles,
                static fn (mixed $role): bool => !\is_string($role) || !\array_key_exists($role, $positions),
            ));

            $this->connection->executeStatement(
                'UPDATE users SET job = :job, roles = :roles WHERE id = :id',
                [
                    'job' => $job,
                    'roles' => json_encode($roles, \JSON_THROW_ON_ERROR),
                    'id' => $row['id'],
                ],
            );
        }
    }

    public function down(Schema $schema): void
    {
        $this->throwIrreversibleMigrationException('The position now lives in the job column.');
    }
}
