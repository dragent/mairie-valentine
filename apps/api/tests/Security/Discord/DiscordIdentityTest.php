<?php

declare(strict_types=1);

namespace App\Tests\Security\Discord;

use App\Security\Discord\DiscordIdentity;
use App\Security\Discord\InvalidDiscordIdentity;
use PHPUnit\Framework\TestCase;

final class DiscordIdentityTest extends TestCase
{
    public function testAcceptsANumericSnowflake(): void
    {
        self::assertSame('42', DiscordIdentity::snowflake('42'));
    }

    public function testRejectsAnIdentityThatDidNotComeFromDiscord(): void
    {
        $this->expectException(InvalidDiscordIdentity::class);

        DiscordIdentity::snowflake('ROLE_MAIRE');
    }
}
