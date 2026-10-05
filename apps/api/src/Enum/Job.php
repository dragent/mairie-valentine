<?php

declare(strict_types=1);

namespace App\Enum;

use App\Entity\User;

/**
 * The three positions held at the town hall. A user without a job is a plain
 * citizen: the roles granted by the position are derived from this enum alone.
 */
enum Job: string
{
    case MAIRE = 'maire';
    case ADJOINT = 'adjoint';
    case SECRETAIRE = 'secretaire';

    public function label(): string
    {
        return match ($this) {
            self::MAIRE => 'Maire',
            self::ADJOINT => 'Maire adjoint',
            self::SECRETAIRE => 'Secrétaire de mairie',
        };
    }

    /**
     * The mayor and his deputy share ROLE_ELU. Only the mayor also gets
     * ROLE_MAIRE, which reserves naming deputies and ceding the seat. The
     * deputy recruits secretaries with ROLE_ELU alone.
     *
     * @return list<string>
     */
    public function roles(): array
    {
        return match ($this) {
            self::MAIRE => [User::ROLE_MAIRE],
            self::ADJOINT => [User::ROLE_ELU],
            self::SECRETAIRE => [User::ROLE_SECRETAIRE],
        };
    }
}
