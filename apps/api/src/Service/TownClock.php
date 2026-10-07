<?php

declare(strict_types=1);

namespace App\Service;

/**
 * Valentine keeps the real month and day, and the year 1889.
 */
final readonly class TownClock
{
    private const YEAR = 1889;

    public function today(?\DateTimeImmutable $now = null): \DateTimeImmutable
    {
        $now ??= new \DateTimeImmutable('now', new \DateTimeZone('Europe/Paris'));

        return $now->setDate(self::YEAR, (int) $now->format('n'), (int) $now->format('j'))->setTime(0, 0);
    }
}
