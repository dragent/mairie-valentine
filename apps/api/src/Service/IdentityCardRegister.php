<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\IdentityCard;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Anonymous tally of identity cards issued since the last mayors' meeting.
 * Closing it removes every line; nothing about the holder is kept.
 */
final readonly class IdentityCardRegister
{
    public function __construct(private EntityManagerInterface $entities)
    {
    }

    public function close(): int
    {
        $removed = $this->entities->createQuery('DELETE FROM '.IdentityCard::class.' card')->execute();

        return \is_int($removed) ? $removed : 0;
    }
}
