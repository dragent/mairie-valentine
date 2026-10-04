<?php

declare(strict_types=1);

namespace App\Doctrine;

use App\Entity\Decree;
use App\Repository\DecreeRepository;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Events;

#[AsEntityListener(event: Events::prePersist, entity: Decree::class)]
final readonly class DecreeReferenceListener
{
    public function __construct(private DecreeRepository $decrees)
    {
    }

    public function prePersist(Decree $decree): void
    {
        if (null === $decree->getReference()) {
            $decree->setReference($this->decrees->nextReference($decree->getCreatedAt()));
        }
    }
}
