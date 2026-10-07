<?php

declare(strict_types=1);

namespace App\Tests\Entity;

use App\Entity\User;
use App\Enum\Job;
use PHPUnit\Framework\TestCase;

final class UserTest extends TestCase
{
    public function testStoredMayorRoleDefinesThePositionWhenNoneWasRecorded(): void
    {
        $user = new User('822535046048645201', 'dragent0');
        $user->setRoles([User::ROLE_MAIRE]);

        self::assertSame(Job::MAIRE, $user->getJob());
        self::assertSame('Maire', $user->getJobLabel());
    }

    public function testAccountWithoutAPositionStaysACitizen(): void
    {
        $user = new User('1', 'ada');

        self::assertNull($user->getJob());
        self::assertNull($user->getJobLabel());
    }

    public function testRecordedPositionWinsOverAStoredRole(): void
    {
        $user = new User('2', 'clerk');
        $user->setJob(Job::SECRETAIRE);
        $user->setRoles([User::ROLE_MAIRE]);

        self::assertSame(Job::SECRETAIRE, $user->getJob());
    }

    public function testDismissingClearsAPositionKeptOnlyAsAStoredRole(): void
    {
        $user = new User('3', 'deputy');
        $user->setRoles([User::ROLE_ELU, User::ROLE_ADMIN]);

        $user->setJob(null);

        self::assertNull($user->getJob());
        self::assertSame([User::ROLE_ADMIN, User::ROLE_USER], $user->getRoles());
    }
}
