<?php

declare(strict_types=1);

namespace App\Service;

use App\Enum\DecreeStatus;

/**
 * What the anonymous board is allowed to load. Draft decrees never leave the database.
 */
final class PublicCatalog
{
    /**
     * @return array{status: DecreeStatus}
     */
    public static function decreeCriteria(): array
    {
        return ['status' => DecreeStatus::PUBLISHED];
    }

    /**
     * Events have no draft status. The board still drops those that have ended.
     *
     * @return array{}
     */
    public static function eventCriteria(): array
    {
        return [];
    }
}
