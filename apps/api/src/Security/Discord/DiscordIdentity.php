<?php

declare(strict_types=1);

namespace App\Security\Discord;

/**
 * Discord is the only source of identity. A snowflake is a decimal id; anything
 * else was not produced by the OAuth2 handshake.
 */
final class DiscordIdentity
{
    public static function snowflake(string $id): string
    {
        if (1 !== preg_match('/^\d{1,32}$/', $id)) {
            throw new InvalidDiscordIdentity('Identifiant Discord invalide.');
        }

        return $id;
    }
}
