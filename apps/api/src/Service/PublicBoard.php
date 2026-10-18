<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Decree;
use App\Entity\MunicipalEvent;
use App\Enum\DecreeStatus;

/**
 * What a visitor may read: published decrees still in force, and events that
 * have not ended. Drafts, notes and appointments stay off the board.
 */
final class PublicBoard
{
    private const TOWN_YEAR = 1889;
    private const CIVIL_YEAR = 2000;

    /**
     * @param list<Decree> $decrees
     *
     * @return list<array{reference: string, title: string, startsAt: string, endsAt: string, posterPath: ?string}>
     */
    public function decrees(array $decrees, \DateTimeImmutable $now): array
    {
        $today = $this->today($now);
        $posted = [];

        foreach ($decrees as $decree) {
            $startsAt = $decree->getStartsAt();
            $endsAt = $decree->getEndsAt();

            if (DecreeStatus::PUBLISHED !== $decree->getStatus() || null === $startsAt || null === $endsAt) {
                continue;
            }

            if ($this->day($endsAt, $now) < $today) {
                continue;
            }

            $posted[] = [
                'reference' => (string) $decree->getReference(),
                'title' => $decree->getTitle(),
                'startsAt' => $startsAt->format(\DATE_ATOM),
                'endsAt' => $endsAt->format(\DATE_ATOM),
                'posterPath' => $decree->getPosterPath(),
            ];
        }

        usort($posted, static fn (array $left, array $right): int => $left['reference'] <=> $right['reference']);

        return $posted;
    }

    /**
     * @param list<MunicipalEvent> $events
     *
     * @return list<array{title: string, startsAt: string, endsAt: ?string, location: ?string, posterPath: ?string}>
     */
    public function events(array $events, \DateTimeImmutable $now): array
    {
        $today = $this->today($now);
        $posted = [];

        foreach ($events as $event) {
            $startsAt = $event->getStartsAt();

            if (null === $startsAt) {
                continue;
            }

            $endsAt = $event->getEndsAt() ?? $startsAt;

            if ($this->day($endsAt, $now) < $today) {
                continue;
            }

            $posted[] = [
                'title' => $event->getTitle(),
                'startsAt' => $startsAt->format(\DATE_ATOM),
                'endsAt' => $event->getEndsAt()?->format(\DATE_ATOM),
                'location' => $event->getLocation(),
                'posterPath' => $event->getPosterPath(),
                'sort' => $startsAt->getTimestamp(),
            ];
        }

        usort($posted, static fn (array $left, array $right): int => $left['sort'] <=> $right['sort']);

        return array_map(static function (array $event): array {
            unset($event['sort']);

            return $event;
        }, $posted);
    }

    private function today(\DateTimeImmutable $now): string
    {
        $local = $now->setTimezone(new \DateTimeZone('Europe/Paris'));

        return sprintf('%d-%s', self::TOWN_YEAR, $local->format('m-d'));
    }

    private function day(\DateTimeImmutable $instant, \DateTimeImmutable $now): string
    {
        $zone = new \DateTimeZone('Europe/Paris');
        $local = $instant->setTimezone($zone);
        $year = (int) $local->format('Y');

        if ($year >= self::CIVIL_YEAR) {
            $year -= (int) $now->setTimezone($zone)->format('Y') - self::TOWN_YEAR;
        }

        return sprintf('%d-%s', $year, $local->format('m-d'));
    }
}
