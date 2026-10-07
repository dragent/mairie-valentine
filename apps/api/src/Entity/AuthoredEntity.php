<?php

declare(strict_types=1);

namespace App\Entity;

/**
 * Anything written in the town hall workspace: who wrote it and when is filled
 * in by {@see \App\State\AuthoredPersistProcessor}, never by the client.
 */
interface AuthoredEntity
{
    public function getAuthor(): ?User;

    public function setAuthor(?User $author): void;

    public function markUpdated(): void;
}
