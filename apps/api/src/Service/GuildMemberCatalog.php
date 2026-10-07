<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use App\Enum\Job;
use App\Repository\UserRepository;
use App\Security\Discord\DiscordApi;
use App\Security\Discord\DiscordApiException;
use App\Security\Discord\GuildMember;
use App\Security\Discord\JobRoleMap;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpExceptionInterface;

/**
 * The people the mayor can promote: whoever is in the Discord guild right now.
 * Discord roles win over the local column when both exist, matching the
 * synchronisation done at sign-in.
 */
final readonly class GuildMemberCatalog
{
    public function __construct(
        private DiscordApi $discordApi,
        private JobRoleMap $roleMap,
        private UserRepository $users,
        #[Autowire('%env(DISCORD_GUILD_ID)%')]
        private string $guildId,
    ) {
    }

    /**
     * @return list<array{discordId: string, username: string, displayName: ?string, avatarUrl: ?string, job: ?string, jobLabel: ?string}>
     */
    public function list(): array
    {
        if ('' === $this->guildId || !$this->discordApi->hasBotToken()) {
            throw new HttpException(503, 'Le Discord n\'est pas configuré : seuls les comptes déjà ouverts sur le portail sont listés.');
        }

        try {
            $members = $this->discordApi->listGuildMembers($this->guildId);
        } catch (DiscordApiException $exception) {
            throw new HttpException(502, $exception->getMessage(), $exception);
        } catch (HttpExceptionInterface $exception) {
            throw new HttpException(502, 'Discord est injoignable.', $exception);
        }

        $locals = [];

        foreach ($this->users->findAll() as $user) {
            $locals[$user->getDiscordId()] = $user;
        }

        $listed = array_map(fn (GuildMember $member): array => $this->present($member, $locals[$member->discordId] ?? null), $members);

        usort($listed, function (array $left, array $right): int {
            $byRank = $this->rank($left['job']) <=> $this->rank($right['job']);

            if (0 !== $byRank) {
                return $byRank;
            }

            return strcasecmp($left['displayName'] ?? $left['username'], $right['displayName'] ?? $right['username']);
        });

        return $listed;
    }

    /**
     * @return array{discordId: string, username: string, displayName: ?string, avatarUrl: ?string, job: ?string, jobLabel: ?string}
     */
    private function present(GuildMember $member, ?User $local): array
    {
        $job = $this->roleMap->isConfigured() ? $this->roleMap->resolveJob($member->roleIds) : null;
        $job ??= $local?->getJob();

        return [
            'discordId' => $member->discordId,
            'username' => $member->username,
            'displayName' => $member->nick ?? $member->displayName,
            'avatarUrl' => $member->avatarUrl,
            'job' => $job?->value,
            'jobLabel' => $job?->label(),
        ];
    }

    private function rank(?string $job): int
    {
        return match ($job) {
            Job::MAIRE->value => 0,
            Job::ADJOINT->value => 1,
            Job::SECRETAIRE->value => 2,
            default => 3,
        };
    }
}
