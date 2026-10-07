<?php

declare(strict_types=1);

namespace App\Enum;

enum NoteStatus: string
{
    case CURRENT = 'current';
    case ARCHIVED = 'archived';

    public function label(): string
    {
        return match ($this) {
            self::CURRENT => 'Au greffe',
            self::ARCHIVED => 'Archivée',
        };
    }
}
