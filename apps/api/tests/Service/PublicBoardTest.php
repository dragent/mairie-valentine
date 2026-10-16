<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Entity\Decree;
use App\Entity\MunicipalEvent;
use App\Enum\DecreeStatus;
use App\Service\PublicBoard;
use PHPUnit\Framework\TestCase;

final class PublicBoardTest extends TestCase
{
    public function testOnlyPublishedDecreesStillInForceArePosted(): void
    {
        $now = new \DateTimeImmutable('2026-10-08 15:00:00', new \DateTimeZone('Europe/Paris'));
        $board = new PublicBoard();

        $current = $this->decree('DEC-1889-002', 'Couvre-feu', DecreeStatus::PUBLISHED, '2026-10-01', '2026-10-10');
        $ended = $this->decree('DEC-1889-001', 'Passé', DecreeStatus::PUBLISHED, '2026-09-01', '2026-10-07');
        $draft = $this->decree('DEC-1889-003', 'Brouillon', DecreeStatus::DRAFT, '2026-10-01', '2026-10-20');
        $townYear = $this->decree('DEC-1889-004', 'Fête', DecreeStatus::PUBLISHED, '1889-10-08', '1889-10-08');

        $posted = $board->decrees([$ended, $draft, $current, $townYear], $now);

        self::assertSame(['DEC-1889-002', 'DEC-1889-004'], array_column($posted, 'reference'));
        self::assertSame('Couvre-feu', $posted[0]['title']);
        self::assertArrayNotHasKey('body', $posted[0]);
    }

    public function testUpcomingAndOngoingEventsArePosted(): void
    {
        $now = new \DateTimeImmutable('2026-10-08 15:00:00', new \DateTimeZone('Europe/Paris'));
        $board = new PublicBoard();

        $ongoing = $this->event('Conseil', '2026-10-07 18:00:00', '2026-10-09 12:00:00', 'Salle');
        $today = $this->event('Foire', '2026-10-08 14:00:00', null, 'Place');
        $past = $this->event('Hier', '2026-10-07 10:00:00', '2026-10-07 12:00:00', 'Place');

        $posted = $board->events([$past, $ongoing, $today], $now);

        self::assertSame(['Conseil', 'Foire'], array_column($posted, 'title'));
        self::assertSame('Salle', $posted[0]['location']);
    }

    private function decree(
        string $reference,
        string $title,
        DecreeStatus $status,
        string $startsOn,
        string $endsOn,
    ): Decree {
        $decree = new Decree();
        $decree->setReference($reference);
        $decree->setTitle($title);
        $decree->setBody('Texte réservé au personnel.');
        $decree->setStatus($status);
        $decree->setStartsAt(new \DateTimeImmutable($startsOn, new \DateTimeZone('Europe/Paris')));
        $decree->setEndsAt(new \DateTimeImmutable($endsOn, new \DateTimeZone('Europe/Paris')));

        return $decree;
    }

    private function event(string $title, string $startsAt, ?string $endsAt, string $location): MunicipalEvent
    {
        $event = new MunicipalEvent();
        $event->setTitle($title);
        $event->setDescription('Réservé.');
        $event->setStartsAt(new \DateTimeImmutable($startsAt, new \DateTimeZone('Europe/Paris')));
        $event->setEndsAt($endsAt === null ? null : new \DateTimeImmutable($endsAt, new \DateTimeZone('Europe/Paris')));
        $event->setLocation($location);

        return $event;
    }
}
