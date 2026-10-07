<?php

declare(strict_types=1);

namespace App\Doctrine;

use App\Entity\Decree;
use App\Service\EventPosterStore;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Events;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

#[AsEntityListener(event: Events::preRemove, entity: Decree::class)]
final readonly class DecreePosterCleanup
{
    public function __construct(
        #[Autowire(service: 'app.decree_poster_store')]
        private EventPosterStore $posters,
    ) {
    }

    public function preRemove(Decree $decree): void
    {
        $this->posters->delete($decree->getPosterPath());
    }
}
