<?php

declare(strict_types=1);

namespace App\Security;

use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTCreatedEvent;
use Lexik\Bundle\JWTAuthenticationBundle\Events;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;

/**
 * The token only names the Discord account. Roles are read from the database
 * on every request, so a client cannot grant itself a position by editing a claim.
 */
#[AsEventListener(event: Events::JWT_CREATED)]
final class JwtRoleClaimStripper
{
    public function __invoke(JWTCreatedEvent $event): void
    {
        $data = $event->getData();
        unset($data['roles']);
        $event->setData($data);
    }
}
