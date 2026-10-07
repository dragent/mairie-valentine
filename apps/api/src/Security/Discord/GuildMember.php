<?php

declare(strict_types=1);

namespace App\Security\Discord;

/**
 * A person currently in the town's Discord guild.
 */
final readonly class GuildMember
{
    /**
     * @param list<string> $roleIds
     */
    public function __construct(
        public string $discordId,
        public string $username,
        public ?string $displayName,
        public ?string $nick,
        public ?string $avatarUrl,
        public array $roleIds,
    ) {
    }
}
