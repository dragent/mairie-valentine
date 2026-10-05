<?php

declare(strict_types=1);

namespace App\Tests\State;

use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Dto\JobAssignment;
use App\Entity\User;
use App\Enum\Job;
use App\Repository\UserRepository;
use App\Security\Discord\DiscordApi;
use App\Security\Discord\JobRoleMap;
use App\Service\JobAssigner;
use App\Service\PromotionTargetResolver;
use App\State\AssignJobProcessor;
use App\Tests\Support\DiscordHttpMock;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Contracts\HttpClient\HttpClientInterface;

final class AssignJobProcessorTest extends TestCase
{
    use DiscordHttpMock;

    public function testUnknownAccountAnswers404(): void
    {
        $users = $this->createMock(UserRepository::class);
        $users->method('find')->with(9)->willReturn(null);

        $this->expectException(NotFoundHttpException::class);
        $this->expectExceptionMessage('Ce compte est introuvable.');

        $this->processor($users)->process($this->assignment(Job::ADJOINT), new Patch(), ['id' => 9]);
    }

    public function testDemotingTheMayorAnswers422(): void
    {
        $mayor = new User('1', 'mayor');
        $mayor->setJob(Job::MAIRE);
        $users = $this->createMock(UserRepository::class);
        $users->method('find')->willReturn($mayor);

        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->never())->method('request');

        try {
            $this->processor($users, $client)->process($this->assignment(null), new Patch(), ['id' => 1]);
            self::fail('Demoting the mayor must be refused.');
        } catch (UnprocessableEntityHttpException) {
            self::assertSame(Job::MAIRE, $mayor->getJob());
        }
    }

    public function testPromotesAGuildMemberWhoNeverOpenedThePortal(): void
    {
        $users = $this->createMock(UserRepository::class);
        $users->method('findOneByDiscordId')->with('55')->willReturn(null);

        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->exactly(2))
            ->method('request')
            ->willReturnCallback(function (string $method, string $url) {
                if ('GET' === $method) {
                    self::assertSame('https://discord.com/api/v10/guilds/guild-1/members/55', $url);

                    return $this->discordResponse(200, [
                        'roles' => [],
                        'user' => ['id' => '55', 'username' => 'ada', 'global_name' => 'Ada'],
                    ]);
                }

                self::assertSame('PUT', $method);
                self::assertSame('https://discord.com/api/v10/guilds/guild-1/members/55/roles/role-adjoint', $url);

                return $this->discordResponse(204);
            });

        $result = $this->processor($users, $client)->process($this->assignment(Job::ADJOINT, '55'), new Post(), []);

        self::assertSame('55', $result->getDiscordId());
        self::assertSame(Job::ADJOINT, $result->getJob());
    }

    public function testDeputyRecruitsASecretary(): void
    {
        $citizen = new User('2', 'citizen');
        $users = $this->createMock(UserRepository::class);
        $users->method('findOneByDiscordId')->with('2')->willReturn($citizen);

        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->once())
            ->method('request')
            ->with('PUT', 'https://discord.com/api/v10/guilds/guild-1/members/2/roles/role-secretaire')
            ->willReturn($this->discordResponse(204));

        $result = $this->processor($users, $client, $this->deputy())
            ->process($this->assignment(Job::SECRETAIRE, '2'), new Post(), []);

        self::assertSame(Job::SECRETAIRE, $result->getJob());
    }

    public function testDeputyCanDismissASecretary(): void
    {
        $secretary = new User('2', 'clerk');
        $secretary->setJob(Job::SECRETAIRE);
        $users = $this->createMock(UserRepository::class);
        $users->method('find')->willReturn($secretary);

        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->once())
            ->method('request')
            ->with('DELETE', 'https://discord.com/api/v10/guilds/guild-1/members/2/roles/role-secretaire')
            ->willReturn($this->discordResponse(204));

        $result = $this->processor($users, $client, $this->deputy())
            ->process($this->assignment(null), new Patch(), ['id' => 2]);

        self::assertNull($result->getJob());
    }

    public function testDeputyCannotHandOutAnotherOffice(): void
    {
        $citizen = new User('2', 'citizen');
        $users = $this->createMock(UserRepository::class);
        $users->method('findOneByDiscordId')->willReturn($citizen);
        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->never())->method('request');

        foreach ([Job::ADJOINT, Job::MAIRE] as $job) {
            try {
                $this->processor($users, $client, $this->deputy())
                    ->process($this->assignment($job, '2'), new Post(), []);
                self::fail($job->value.' must stay reserved to the mayor.');
            } catch (AccessDeniedHttpException $exception) {
                self::assertSame('Le maire adjoint ne peut recruter que des secrétaires.', $exception->getMessage());
                self::assertNull($citizen->getJob());
            }
        }
    }

    public function testDeputyCannotChangeTheMayorOrAnotherDeputy(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->never())->method('request');

        foreach ([Job::MAIRE, Job::ADJOINT] as $held) {
            $target = new User('1', 'official');
            $target->setJob($held);
            $users = $this->createMock(UserRepository::class);
            $users->method('find')->willReturn($target);

            try {
                $this->processor($users, $client, $this->deputy())
                    ->process($this->assignment(Job::SECRETAIRE), new Patch(), ['id' => 1]);
                self::fail($held->value.' must be left untouched by a deputy.');
            } catch (AccessDeniedHttpException) {
                self::assertSame($held, $target->getJob());
            }
        }
    }

    public function testDiscordRefusingTheChangeAnswers502(): void
    {
        $citizen = new User('2', 'citizen');
        $users = $this->createMock(UserRepository::class);
        $users->method('find')->willReturn($citizen);

        $client = $this->createMock(HttpClientInterface::class);
        $client->method('request')->willReturn($this->discordResponse(403));

        try {
            $this->processor($users, $client)->process($this->assignment(Job::ADJOINT), new Patch(), ['id' => 2]);
            self::fail('A Discord refusal must not look like a success.');
        } catch (HttpException $exception) {
            self::assertSame(502, $exception->getStatusCode());
            self::assertNull($citizen->getJob());
        }
    }

    private function assignment(?Job $job, ?string $discordId = null): JobAssignment
    {
        $assignment = new JobAssignment();
        $assignment->job = $job;
        $assignment->discordId = $discordId;

        return $assignment;
    }

    private function processor(
        UserRepository $users,
        ?HttpClientInterface $client = null,
        ?Security $security = null,
    ): AssignJobProcessor {
        $client ??= $this->createMock(HttpClientInterface::class);
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $discordApi = new DiscordApi($client, 'bot-token');

        return new AssignJobProcessor(
            users: $users,
            jobAssigner: new JobAssigner(
                discordApi: $discordApi,
                roleMap: new JobRoleMap('role-maire', 'role-adjoint', 'role-secretaire'),
                entityManager: $entityManager,
                users: $users,
                guildId: 'guild-1',
            ),
            targets: new PromotionTargetResolver(
                users: $users,
                discordApi: $discordApi,
                entityManager: $entityManager,
                guildId: 'guild-1',
            ),
            security: $security ?? $this->mayor(),
        );
    }

    private function mayor(): Security
    {
        $security = $this->createMock(Security::class);
        $security->method('isGranted')->willReturnCallback(
            static fn (mixed $attribute): bool => User::ROLE_MAIRE === $attribute,
        );

        return $security;
    }

    private function deputy(): Security
    {
        $security = $this->createMock(Security::class);
        $security->method('isGranted')->willReturn(false);

        return $security;
    }
}
