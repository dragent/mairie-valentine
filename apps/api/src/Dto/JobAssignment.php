<?php

declare(strict_types=1);

namespace App\Dto;

use App\Enum\Job;

/**
 * Body of a promotion: the position to hand out, or null to send the account
 * back to being a plain citizen.
 *
 * Going through a dedicated payload rather than writing `User::$job` keeps the
 * previous position readable in the processor, which is what has to be revoked
 * on Discord.
 */
final class JobAssignment
{
    public ?Job $job = null;
}
