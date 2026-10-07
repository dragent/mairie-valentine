<?php

declare(strict_types=1);

namespace App\Enum;

enum DecreeStatus: string
{
    case DRAFT = 'draft';
    case PUBLISHED = 'published';
    case REPEALED = 'repealed';

    public function label(): string
    {
        return match ($this) {
            self::DRAFT => 'Brouillon',
            self::PUBLISHED => 'Publié',
            self::REPEALED => 'Abrogé',
        };
    }
}
