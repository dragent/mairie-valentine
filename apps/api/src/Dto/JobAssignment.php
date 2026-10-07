<?php

declare(strict_types=1);

namespace App\Dto;

use App\Enum\Job;

/**
 * Body of a promotion: the position to hand out, or null to send the account
 * back to being a plain citizen. `discordId` names a guild member on
 * `POST /promotions`, including someone who has never opened the portal.
 *
 * Going through a dedicated payload rather than writing `User::$job` keeps the
 * previous position readable in the processor, which is what has to be revoked
 * on Discord. `maire` is a succession: the previous mayor loses the seat.
 */
final class JobAssignment
{
    public ?Job $job = null;

    public ?string $discordId = null;
}
