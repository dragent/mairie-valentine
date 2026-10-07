<?php

declare(strict_types=1);

namespace App\Security\Discord;

use App\Enum\Job;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Translates between the town hall positions and the Discord roles that carry
 * them. Discord is the source of truth, so every position must be backed by a
 * role identifier for the synchronisation to be usable at all.
 */
final readonly class JobRoleMap
{
    /** @var array<string, string> position value => Discord role id */
    private array $roleIds;

    public function __construct(
        #[Autowire('%env(DISCORD_ROLE_MAIRE)%')]
        string $maireRoleId,
        #[Autowire('%env(DISCORD_ROLE_ADJOINT)%')]
        string $adjointRoleId,
        #[Autowire('%env(DISCORD_ROLE_SECRETAIRE)%')]
        string $secretaireRoleId,
    ) {
        $this->roleIds = [
            Job::MAIRE->value => trim($maireRoleId),
            Job::ADJOINT->value => trim($adjointRoleId),
            Job::SECRETAIRE->value => trim($secretaireRoleId),
        ];
    }

    public function isConfigured(): bool
    {
        foreach ($this->roleIds as $roleId) {
            if ('' === $roleId) {
                return false;
            }
        }

        return true;
    }

    /**
     * @throws DiscordApiException when the position has no Discord role
     */
    public function roleId(Job $job): string
    {
        $roleId = $this->roleIds[$job->value];

        if ('' === $roleId) {
            throw new DiscordApiException(\sprintf('Aucun rôle Discord configuré pour la fonction « %s ».', $job->label()));
        }

        return $roleId;
    }

    /**
     * The most senior matching position wins, so holding several roles at once
     * on Discord cannot downgrade somebody.
     *
     * @param list<string> $roleIds
     */
    public function resolveJob(array $roleIds): ?Job
    {
        foreach ([Job::MAIRE, Job::ADJOINT, Job::SECRETAIRE] as $job) {
            if ('' !== $this->roleIds[$job->value] && \in_array($this->roleIds[$job->value], $roleIds, true)) {
                return $job;
            }
        }

        return null;
    }
}
