<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\TownClock;
use PHPUnit\Framework\TestCase;

final class TownClockTest extends TestCase
{
    public function testTheTownKeepsTheRealMonthAndDayIn1889(): void
    {
        $clock = new TownClock();
        $today = $clock->today(new \DateTimeImmutable('2026-10-07 15:30:00', new \DateTimeZone('Europe/Paris')));

        self::assertSame('1889-10-07', $today->format('Y-m-d'));
    }
}
