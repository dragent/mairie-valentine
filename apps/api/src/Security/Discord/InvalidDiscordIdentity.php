<?php

declare(strict_types=1);

namespace App\Security\Discord;

/**
 * The Discord account id did not come from Discord's own token response.
 */
final class InvalidDiscordIdentity extends \RuntimeException
{
}
