<?php

declare(strict_types=1);

namespace App\Doctrine;

use App\Entity\MunicipalEvent;
use App\Service\EventPosterStore;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Events;

#[AsEntityListener(event: Events::preRemove, entity: MunicipalEvent::class)]
final readonly class EventPosterCleanup
{
    public function __construct(private EventPosterStore $posters)
    {
    }

    public function preRemove(MunicipalEvent $event): void
    {
        $this->posters->delete($event->getPosterPath());
    }
}
