<?php

declare(strict_types=1);

namespace App\Doctrine;

use App\Entity\Decree;
use App\Service\TownClock;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Events;

#[AsEntityListener(event: Events::postLoad, entity: Decree::class)]
#[AsEntityListener(event: Events::prePersist, entity: Decree::class)]
#[AsEntityListener(event: Events::preUpdate, entity: Decree::class)]
final readonly class DecreeRepealListener
{
    public function __construct(private TownClock $clock)
    {
    }

    public function postLoad(Decree $decree): void
    {
        $decree->repealIfThePeriodHasEnded($this->clock->today());
    }

    public function prePersist(Decree $decree): void
    {
        $decree->repealIfThePeriodHasEnded($this->clock->today());
    }

    public function preUpdate(Decree $decree): void
    {
        $decree->repealIfThePeriodHasEnded($this->clock->today());
    }
}
