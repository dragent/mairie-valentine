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
