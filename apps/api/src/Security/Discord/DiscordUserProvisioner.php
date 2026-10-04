<?php

declare(strict_types=1);

namespace App\Security\Discord;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpExceptionInterface;
use Wohali\OAuth2\Client\Provider\DiscordResourceOwner;

/**
 * Creates the local account on first sign-in and keeps the Discord profile in
 * sync on every subsequent one, including the town hall position: the guild
 * roles decide who is mayor, deputy or secretary.
 *
 * ROLE_ADMIN, which no position grants, is left untouched.
 */
final readonly class DiscordUserProvisioner
{
    public function __construct(
        private UserRepository $users,
        private EntityManagerInterface $entityManager,
        private DiscordApi $discordApi,
        private JobRoleMap $roleMap,
        #[Autowire('%env(DISCORD_GUILD_ID)%')]
        private string $guildId,
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

        $this->syncJob($user);

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }

    private function syncJob(User $user): void
    {
        // Without a guild or a bot, there is nothing to read the roles from and
        // the position stays whatever it already is in database.
        if ('' === $this->guildId || !$this->discordApi->hasBotToken() || !$this->roleMap->isConfigured()) {
            return;
        }

        try {
            $roleIds = $this->discordApi->fetchMemberRoleIds($this->guildId, $user->getDiscordId());
        } catch (HttpExceptionInterface|DiscordApiException) {
            // Discord is unreachable: keep the last known position rather than
            // locking the whole town hall out of its own workspace.
            return;
        }

        $user->setJob(null === $roleIds ? null : $this->roleMap->resolveJob($roleIds));
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
