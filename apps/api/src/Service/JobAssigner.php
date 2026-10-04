<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use App\Enum\Job;
use App\Security\Discord\DiscordApi;
use App\Security\Discord\DiscordApiException;
use App\Security\Discord\JobRoleMap;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpExceptionInterface;

/**
 * Moves somebody from one position to another. Discord holds the truth, so the
 * guild roles are rewritten first and the local column only follows once the
 * change went through: a failed promotion leaves nothing half-applied.
 *
 * Without a configured bot there is no guild to write to, and the position is
 * then managed locally only — the same condition under which
 * {@see \App\Security\Discord\DiscordUserProvisioner} stops resynchronising it.
 */
final readonly class JobAssigner
{
    public function __construct(
        private DiscordApi $discordApi,
        private JobRoleMap $roleMap,
        private EntityManagerInterface $entityManager,
        #[Autowire('%env(DISCORD_GUILD_ID)%')]
        private string $guildId,
    ) {
    }

    /**
     * @throws DiscordApiException when the guild roles could not be rewritten
     */
    public function assign(User $target, ?Job $job): void
    {
        $current = $target->getJob();

        if ($current === $job) {
            return;
        }

        if ($this->syncsWithDiscord()) {
            $this->rewriteGuildRoles($target, $current, $job);
        }

        $target->setJob($job);
        $this->entityManager->flush();
    }

    private function syncsWithDiscord(): bool
    {
        return '' !== $this->guildId && $this->discordApi->hasBotToken() && $this->roleMap->isConfigured();
    }

    private function rewriteGuildRoles(User $target, ?Job $current, ?Job $job): void
    {
        $granted = null === $job ? null : $this->roleMap->roleId($job);
        $revoked = null === $current ? null : $this->roleMap->roleId($current);

        try {
            if (null !== $granted) {
                $this->discordApi->addMemberRole($this->guildId, $target->getDiscordId(), $granted);
            }

            if (null !== $revoked && $revoked !== $granted) {
                $this->discordApi->removeMemberRole($this->guildId, $target->getDiscordId(), $revoked);
            }
        } catch (HttpExceptionInterface $exception) {
            throw new DiscordApiException('Discord est injoignable, la fonction n\'a pas été modifiée.', previous: $exception);
        }
    }
}
