<?php

declare(strict_types=1);

namespace App\Tests\Security;

use App\Entity\User;
use App\Security\JwtRoleClaimStripper;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTCreatedEvent;
use PHPUnit\Framework\TestCase;

final class JwtRoleClaimStripperTest extends TestCase
{
    public function testTheTokenKeepsTheDiscordIdentityAndDropsTheRoles(): void
    {
        $event = new JWTCreatedEvent(
            ['discordId' => '42', 'roles' => ['ROLE_MAIRE', 'ROLE_USER']],
            new User('42', 'mayor'),
        );

        (new JwtRoleClaimStripper())($event);

        self::assertSame(['discordId' => '42'], $event->getData());
    }
}
