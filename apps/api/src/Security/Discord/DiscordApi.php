<?php

declare(strict_types=1);

namespace App\Security\Discord;

use Symfony\Component\HttpClient\Exception\ClientException;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Thin wrapper around the parts of the Discord REST API we need on top of the
 * OAuth2 handshake.
 */
final readonly class DiscordApi
{
    public function __construct(private HttpClientInterface $client)
    {
    }

    /**
     * @throws HttpExceptionInterface when Discord cannot be reached
     */
    public function isGuildMember(string $accessToken, string $guildId): bool
    {
        try {
            $guilds = $this->client->request('GET', 'https://discord.com/api/v10/users/@me/guilds', [
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
}
