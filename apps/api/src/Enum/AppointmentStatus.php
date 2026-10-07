<?php

declare(strict_types=1);

namespace App\Enum;

enum AppointmentStatus: string
{
    case SCHEDULED = 'scheduled';
    case HONORED = 'honored';
    case CANCELLED = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::SCHEDULED => 'Prévu',
            self::HONORED => 'Honoré',
            self::CANCELLED => 'Annulé',
        };
    }
}
