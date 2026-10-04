<?php

declare(strict_types=1);

namespace App\Security\Discord;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Wohali\OAuth2\Client\Provider\DiscordResourceOwner;

/**
 * Creates the local account on first sign-in and keeps the Discord profile in
 * sync on every subsequent one. Roles are never touched here: they are managed
 * from the back office.
 */
final readonly class DiscordUserProvisioner
{
    public function __construct(
        private UserRepository $users,
        private EntityManagerInterface $entityManager,
    ) {
    }

    public function provision(DiscordResourceOwner $owner): User
    {
        $discordId = (string) $owner->getId();
        $profile = $owner->toArray();

        $user = $this->users->findOneByDiscordId($discordId)
            ?? new User($discordId, (string) $owner->getUsername());

        $user
            ->setUsername((string) $owner->getUsername())
            ->setDisplayName($profile['global_name'] ?? null)
            ->setEmail($owner->getEmail())
            ->setAvatarUrl($this->avatarUrl($discordId, $profile['avatar'] ?? null))
            ->touchLastLogin();

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }

    private function avatarUrl(string $discordId, ?string $hash): ?string
    {
        if (null === $hash) {
            return null;
        }

        $extension = str_starts_with($hash, 'a_') ? 'gif' : 'png';

        return \sprintf('https://cdn.discordapp.com/avatars/%s/%s.%s?size=128', $discordId, $hash, $extension);
    }
}
