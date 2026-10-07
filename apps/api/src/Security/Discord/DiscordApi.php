<?php

declare(strict_types=1);

namespace App\Security\Discord;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpClient\Exception\ClientException;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\ResponseInterface;

/**
 * Thin wrapper around the parts of the Discord REST API we need on top of the
 * OAuth2 handshake.
 *
 * Reading and writing guild roles goes through the bot token: the OAuth2 token
 * of the signed-in user could never grant somebody else a role.
 */
final readonly class DiscordApi
{
    private const BASE_URL = 'https://discord.com/api/v10';

    public function __construct(
        private HttpClientInterface $client,
        #[Autowire('%env(DISCORD_BOT_TOKEN)%')]
        private string $botToken,
    ) {
    }

    public function hasBotToken(): bool
    {
        return '' !== $this->botToken;
    }

    /**
     * @throws HttpExceptionInterface when Discord cannot be reached
     */
    public function isGuildMember(string $accessToken, string $guildId): bool
    {
        try {
            $guilds = $this->client->request('GET', self::BASE_URL.'/users/@me/guilds', [
                'auth_bearer' => $accessToken,
                'timeout' => 10,
            ])->toArray();
        } catch (ClientException) {
            // The token is missing the `guilds` scope, or it has been revoked.
            return false;
        }

        foreach ($guilds as $guild) {
            if (isset($guild['id']) && (string) $guild['id'] === $guildId) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return list<string>|null the role identifiers held in the guild, or null
     *                           when the account is not a member of it
     *
     * @throws HttpExceptionInterface when Discord cannot be reached
     */
    public function fetchMemberRoleIds(string $guildId, string $discordId): ?array
    {
        try {
            $member = $this->asBot('GET', \sprintf('/guilds/%s/members/%s', $guildId, $discordId))->toArray();
        } catch (ClientException) {
            // 404: the account left the guild, or the bot is not in it.
            return null;
        }

        return array_values(array_map(strval, $member['roles'] ?? []));
    }

    /**
     * @throws DiscordApiException      when Discord refuses the change
     * @throws HttpExceptionInterface   when Discord cannot be reached
     */
    public function addMemberRole(string $guildId, string $discordId, string $roleId): void
    {
        $this->writeMemberRole('PUT', $guildId, $discordId, $roleId);
    }

    /**
     * @throws DiscordApiException      when Discord refuses the change
     * @throws HttpExceptionInterface   when Discord cannot be reached
     */
    public function removeMemberRole(string $guildId, string $discordId, string $roleId): void
    {
        $this->writeMemberRole('DELETE', $guildId, $discordId, $roleId);
    }

    /**
     * @throws DiscordApiException    when Discord refuses the listing
     * @throws HttpExceptionInterface when Discord cannot be reached
     *
     * @return list<GuildMember>
     */
    public function listGuildMembers(string $guildId): array
    {
        $members = [];
        $after = '0';

        for ($page = 0; $page < 10; ++$page) {
            $path = \sprintf('/guilds/%s/members?limit=1000&after=%s', $guildId, $after);
            $response = $this->asBot('GET', $path);
            $status = $response->getStatusCode();

            if (403 === $status) {
                throw new DiscordApiException('Le bot n\'a pas l\'intent « Server Members » : les membres du Discord ne peuvent pas être listés.');
            }

            if (200 !== $status) {
                throw new DiscordApiException(\sprintf('GET %s a répondu %d.', $path, $status));
            }

            /** @var list<array<string, mixed>> $rows */
            $rows = $response->toArray();
            $lastId = null;

            foreach ($rows as $row) {
                if (!\is_array($row)) {
                    continue;
                }

                $user = $row['user'] ?? null;

                if (\is_array($user) && isset($user['id'])) {
                    $lastId = (string) $user['id'];
                }

                $member = $this->mapMember($row);

                if (null !== $member) {
                    $members[] = $member;
                }
            }

            if (\count($rows) < 1000 || null === $lastId || $lastId === $after) {
                break;
            }

            $after = $lastId;
        }

        return $members;
    }

    /**
     * @throws DiscordApiException    when Discord refuses the lookup
     * @throws HttpExceptionInterface when Discord cannot be reached
     */
    public function fetchGuildMember(string $guildId, string $discordId): ?GuildMember
    {
        $path = \sprintf('/guilds/%s/members/%s', $guildId, $discordId);
        $response = $this->asBot('GET', $path);
        $status = $response->getStatusCode();

        if (404 === $status) {
            return null;
        }

        if (200 !== $status) {
            throw new DiscordApiException(\sprintf('GET %s a répondu %d.', $path, $status));
        }

        $payload = $response->toArray();

        return \is_array($payload) ? $this->mapMember($payload) : null;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function mapMember(array $payload): ?GuildMember
    {
        $user = $payload['user'] ?? null;

        if (!\is_array($user) || !isset($user['id'], $user['username']) || true === ($user['bot'] ?? false)) {
            return null;
        }

        $discordId = (string) $user['id'];
        $avatar = isset($user['avatar']) && \is_string($user['avatar']) ? $user['avatar'] : null;
        $roles = isset($payload['roles']) && \is_array($payload['roles']) ? $payload['roles'] : [];

        return new GuildMember(
            discordId: $discordId,
            username: (string) $user['username'],
            displayName: isset($user['global_name']) && \is_string($user['global_name']) ? $user['global_name'] : null,
            nick: isset($payload['nick']) && \is_string($payload['nick']) ? $payload['nick'] : null,
            avatarUrl: $this->avatarUrl($discordId, $avatar),
            roleIds: array_values(array_map(strval(...), $roles)),
        );
    }

    private function avatarUrl(string $discordId, ?string $hash): ?string
    {
        if (null === $hash) {
            return null;
        }

        $extension = str_starts_with($hash, 'a_') ? 'gif' : 'png';

        return \sprintf('https://cdn.discordapp.com/avatars/%s/%s.%s?size=128', $discordId, $hash, $extension);
    }

    private function writeMemberRole(string $method, string $guildId, string $discordId, string $roleId): void
    {
        $path = \sprintf('/guilds/%s/members/%s/roles/%s', $guildId, $discordId, $roleId);
        $status = $this->asBot($method, $path)->getStatusCode();

        // 204 is the only success Discord returns here. A 403 almost always
        // means the bot role sits below the role it is asked to hand out.
        if (204 !== $status) {
            throw new DiscordApiException(\sprintf('%s %s a répondu %d.', $method, $path, $status));
        }
    }

    private function asBot(string $method, string $path): ResponseInterface
    {
        if (!$this->hasBotToken()) {
            throw new DiscordApiException('DISCORD_BOT_TOKEN n\'est pas renseigné.');
        }

        return $this->client->request($method, self::BASE_URL.$path, [
            'headers' => ['Authorization' => 'Bot '.$this->botToken],
            'timeout' => 10,
        ]);
    }
}
