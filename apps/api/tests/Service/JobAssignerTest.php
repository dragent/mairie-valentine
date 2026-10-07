<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Entity\User;
use App\Enum\Job;
use App\Repository\UserRepository;
use App\Security\Discord\DiscordApi;
use App\Security\Discord\DiscordApiException;
use App\Security\Discord\JobRoleMap;
use App\Service\JobAssigner;
use App\Service\JobAssignmentException;
use App\Tests\Support\DiscordHttpMock;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Contracts\HttpClient\HttpClientInterface;

final class JobAssignerTest extends TestCase
{
    use DiscordHttpMock;

    private const GUILD = 'guild-1';
    private const MAIRE_ROLE = 'role-maire';
    private const ADJOINT_ROLE = 'role-adjoint';
    private const SECRETAIRE_ROLE = 'role-secretaire';

    public function testAssigningADeputyDoesNotTouchTheMayorOrOtherDeputies(): void
    {
        $mayor = $this->user('1', 'mayor', Job::MAIRE);
        $deputy = $this->user('9', 'dep', Job::ADJOINT);
        $citizen = $this->user('2', 'citizen');

        $users = $this->createMock(UserRepository::class);
        $users->expects($this->never())->method('findBy');

        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->once())
            ->method('request')
            ->with('PUT', $this->roleUrl('2', self::ADJOINT_ROLE))
            ->willReturn($this->discordResponse(204));

        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects($this->once())->method('flush');

        $this->assigner($client, $users, $entityManager)->assign($citizen, Job::ADJOINT);

        self::assertSame(Job::ADJOINT, $citizen->getJob());
        self::assertSame(Job::MAIRE, $mayor->getJob());
        self::assertSame(Job::ADJOINT, $deputy->getJob());
    }

    public function testAssigningTheJobAlreadyHeldDoesNothing(): void
    {
        $deputy = $this->user('9', 'dep', Job::ADJOINT);
        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->never())->method('request');
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects($this->never())->method('flush');

        $this->assigner($client, $this->createMock(UserRepository::class), $entityManager)
            ->assign($deputy, Job::ADJOINT);

        self::assertSame(Job::ADJOINT, $deputy->getJob());
    }

    public function testDismissingADeputyRemovesTheGuildRoleWithoutTheirApproval(): void
    {
        $deputy = $this->user('9', 'dep', Job::ADJOINT);
        $deputy->setRoles([User::ROLE_ELU]);

        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->once())
            ->method('request')
            ->with('DELETE', $this->roleUrl('9', self::ADJOINT_ROLE))
            ->willReturn($this->discordResponse(204));

        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects($this->once())->method('flush');

        $this->assigner($client, $this->createMock(UserRepository::class), $entityManager)
            ->assign($deputy, null);

        self::assertNull($deputy->getJob());
        self::assertNotContains(User::ROLE_ELU, $deputy->getRoles());
    }

    public function testTheMayorCanOnlyLeaveByCedingTheSeat(): void
    {
        $mayor = $this->user('1', 'mayor', Job::MAIRE);
        $users = $this->createMock(UserRepository::class);
        $users->expects($this->never())->method('findBy');
        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->never())->method('request');
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects($this->never())->method('flush');

        $this->expectException(JobAssignmentException::class);
        $this->expectExceptionMessage('Le maire ne peut quitter sa fonction qu\'en la cédant à un autre membre.');

        $this->assigner($client, $users, $entityManager)->assign($mayor, null);
    }

    public function testCedingTheSeatMakesTheSuccessorTheOnlyMayor(): void
    {
        $mayor = $this->user('1', 'mayor', Job::MAIRE);
        $otherMayor = $this->user('3', 'other', Job::MAIRE);
        $successor = $this->user('2', 'next', Job::ADJOINT);

        $users = $this->createMock(UserRepository::class);
        $users->method('findBy')->with(['job' => Job::MAIRE])->willReturn([$mayor, $otherMayor]);

        $calls = [];
        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->exactly(4))
            ->method('request')
            ->willReturnCallback(function (string $method, string $url) use (&$calls) {
                $calls[] = [$method, $url];

                return $this->discordResponse(204);
            });

        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects($this->once())->method('flush');

        $this->assigner($client, $users, $entityManager)->assign($successor, Job::MAIRE);

        self::assertSame([
            ['PUT', $this->roleUrl('2', self::MAIRE_ROLE)],
            ['DELETE', $this->roleUrl('2', self::ADJOINT_ROLE)],
            ['DELETE', $this->roleUrl('1', self::MAIRE_ROLE)],
            ['DELETE', $this->roleUrl('3', self::MAIRE_ROLE)],
        ], $calls);
        self::assertSame(Job::MAIRE, $successor->getJob());
        self::assertNull($mayor->getJob());
        self::assertNull($otherMayor->getJob());
    }

    public function testCedingTheSeatToTheIncumbentDoesNothing(): void
    {
        $mayor = $this->user('1', 'mayor', Job::MAIRE);
        $samePerson = $this->user('1', 'mayor', Job::MAIRE);

        $users = $this->createMock(UserRepository::class);
        $users->method('findBy')->with(['job' => Job::MAIRE])->willReturn([$mayor]);

        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->never())->method('request');
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects($this->never())->method('flush');

        $this->assigner($client, $users, $entityManager)->assign($samePerson, Job::MAIRE);

        self::assertSame(Job::MAIRE, $mayor->getJob());
        self::assertSame(Job::MAIRE, $samePerson->getJob());
    }

    public function testADiscordFailureDuringSuccessionChangesNothingLocallyAndRestoresTheSuccessor(): void
    {
        $mayor = $this->user('1', 'mayor', Job::MAIRE);
        $successor = $this->user('2', 'next', Job::ADJOINT);

        $users = $this->createMock(UserRepository::class);
        $users->method('findBy')->willReturn([$mayor]);

        $calls = [];
        $attempt = 0;
        $client = $this->createMock(HttpClientInterface::class);
        $client->method('request')->willReturnCallback(function (string $method, string $url) use (&$calls, &$attempt) {
            $calls[] = [$method, $url];
            ++$attempt;

            return $this->discordResponse(3 === $attempt ? 500 : 204);
        });

        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects($this->never())->method('flush');

        try {
            $this->assigner($client, $users, $entityManager)->assign($successor, Job::MAIRE);
            self::fail('Discord refusing the change must abort the succession.');
        } catch (DiscordApiException) {
            self::assertSame([
                ['PUT', $this->roleUrl('2', self::MAIRE_ROLE)],
                ['DELETE', $this->roleUrl('2', self::ADJOINT_ROLE)],
                ['DELETE', $this->roleUrl('1', self::MAIRE_ROLE)],
                ['PUT', $this->roleUrl('2', self::ADJOINT_ROLE)],
                ['DELETE', $this->roleUrl('2', self::MAIRE_ROLE)],
            ], $calls);
            self::assertSame(Job::ADJOINT, $successor->getJob());
            self::assertSame(Job::MAIRE, $mayor->getJob());
        }
    }

    public function testSuccessionWithoutDiscordOnlyUpdatesTheRegister(): void
    {
        $mayor = $this->user('1', 'mayor', Job::MAIRE);
        $successor = $this->user('2', 'next', Job::ADJOINT);

        $users = $this->createMock(UserRepository::class);
        $users->method('findBy')->willReturn([$mayor]);
        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->never())->method('request');
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects($this->once())->method('flush');

        $this->assigner($client, $users, $entityManager, guildId: '')->assign($successor, Job::MAIRE);

        self::assertSame(Job::MAIRE, $successor->getJob());
        self::assertNull($mayor->getJob());
    }

    private function user(string $discordId, string $username, ?Job $job = null): User
    {
        $user = new User($discordId, $username);
        $user->setJob($job);

        return $user;
    }

    private function assigner(
        HttpClientInterface $client,
        UserRepository $users,
        EntityManagerInterface $entityManager,
        string $guildId = self::GUILD,
        string $botToken = 'bot-token',
    ): JobAssigner {
        return new JobAssigner(
            discordApi: new DiscordApi($client, $botToken),
            roleMap: new JobRoleMap(self::MAIRE_ROLE, self::ADJOINT_ROLE, self::SECRETAIRE_ROLE),
            entityManager: $entityManager,
            users: $users,
            guildId: $guildId,
        );
    }

    private function roleUrl(string $discordId, string $roleId): string
    {
        return \sprintf('https://discord.com/api/v10/guilds/%s/members/%s/roles/%s', self::GUILD, $discordId, $roleId);
    }
}
