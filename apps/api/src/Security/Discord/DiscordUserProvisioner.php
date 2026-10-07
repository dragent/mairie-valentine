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
 * sync on every subsequent one: the name shown is the nickname on the town's
 * Discord server, and the guild roles decide who is mayor, deputy or secretary.
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

        $globalName = isset($profile['global_name']) && \is_string($profile['global_name']) && '' !== $profile['global_name']
            ? $profile['global_name']
            : null;

        $user
            ->setUsername((string) $owner->getUsername())
            ->setEmail($owner->getEmail())
            ->setAvatarUrl($this->avatarUrl($discordId, \is_string($profile['avatar'] ?? null) ? $profile['avatar'] : null))
            ->touchLastLogin();

        $this->syncFromGuild($user, $globalName);

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }

    /**
     * The name shown in the town hall is the nickname set on the Discord server
     * (the character), not the Discord account name. The position still comes
     * from the guild roles.
     */
    private function syncFromGuild(User $user, ?string $globalName): void
    {
        // Without a guild or a bot, there is nothing to read. The Discord
        // display name is then the only name we have.
        if ('' === $this->guildId || !$this->discordApi->hasBotToken()) {
            $user->setDisplayName($globalName ?? $user->getDisplayName());

            return;
        }

        try {
            $member = $this->discordApi->fetchGuildMember($this->guildId, $user->getDiscordId());
        } catch (HttpExceptionInterface|DiscordApiException) {
            // Discord is unreachable: keep the last known name and position
            // rather than locking the whole town hall out of its own workspace.
            if (null === $user->getDisplayName()) {
                $user->setDisplayName($globalName);
            }

            return;
        }

        $nick = $member?->nick;
        $user->setDisplayName((null !== $nick && '' !== trim($nick)) ? $nick : $globalName);

        if (!$this->roleMap->isConfigured()) {
            return;
        }

        $user->setJob(null === $member ? null : $this->roleMap->resolveJob($member->roleIds));
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
