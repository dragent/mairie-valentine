<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Entity\User;
use App\Enum\Job;
use App\Repository\UserRepository;
use App\Security\Discord\DiscordApi;
use App\Security\Discord\JobRoleMap;
use App\Service\GuildMemberCatalog;
use App\Tests\Support\DiscordHttpMock;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Contracts\HttpClient\HttpClientInterface;

final class GuildMemberCatalogTest extends TestCase
{
    use DiscordHttpMock;

    public function testListsGuildMembersWithTheirTownHallPositionAndSkipsBots(): void
    {
        $sam = new User('3', 'sam');
        $sam->setDisplayName('Sam');
        $sam->setJob(Job::SECRETAIRE);

        $users = $this->createMock(UserRepository::class);
        $users->method('findAll')->willReturn([$sam]);

        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->once())
            ->method('request')
            ->with('GET', 'https://discord.com/api/v10/guilds/guild-1/members?limit=1000&after=0')
            ->willReturn($this->discordResponse(200, [
                [
                    'nick' => 'Le Maire',
                    'roles' => ['role-maire'],
                    'user' => ['id' => '1', 'username' => 'boss', 'global_name' => 'Boss', 'avatar' => null],
                ],
                [
                    'roles' => [],
                    'user' => ['id' => '2', 'username' => 'zoe', 'global_name' => 'Zoe', 'bot' => true],
                ],
                [
                    'roles' => [],
                    'user' => ['id' => '3', 'username' => 'sam', 'global_name' => 'Sam'],
                ],
            ]));

        $listed = $this->catalog($client, $users)->list();

        self::assertSame([
            [
                'discordId' => '1',
                'username' => 'boss',
                'displayName' => 'Le Maire',
                'avatarUrl' => null,
                'job' => 'maire',
                'jobLabel' => 'Maire',
            ],
            [
                'discordId' => '3',
                'username' => 'sam',
                'displayName' => 'Sam',
                'avatarUrl' => null,
                'job' => 'secretaire',
                'jobLabel' => 'Secrétaire de mairie',
            ],
        ], $listed);
    }

    public function testDiscordRolesWinOverAStaleLocalJob(): void
    {
        $local = new User('1', 'boss');
        $local->setJob(Job::SECRETAIRE);

        $users = $this->createMock(UserRepository::class);
        $users->method('findAll')->willReturn([$local]);

        $client = $this->createMock(HttpClientInterface::class);
        $client->method('request')->willReturn($this->discordResponse(200, [[
            'roles' => ['role-adjoint'],
            'user' => ['id' => '1', 'username' => 'boss', 'global_name' => 'Boss'],
        ]]));

        $listed = $this->catalog($client, $users)->list();

        self::assertSame('adjoint', $listed[0]['job']);
    }

    public function testRefusesToListMembersWhenDiscordIsNotConfigured(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->never())->method('request');

        try {
            $this->catalog($client, $this->createMock(UserRepository::class), guildId: '')->list();
            self::fail('An unconfigured Discord must not be queried.');
        } catch (HttpException $exception) {
            self::assertSame(503, $exception->getStatusCode());
            self::assertSame('Le Discord n\'est pas configuré : la liste des membres est indisponible.', $exception->getMessage());
        }
    }

    public function testReportsAMissingMembersIntent(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $client->method('request')->willReturn($this->discordResponse(403));

        try {
            $this->catalog($client, $this->createMock(UserRepository::class))->list();
            self::fail('A 403 from Discord must surface the missing intent.');
        } catch (HttpException $exception) {
            self::assertSame(502, $exception->getStatusCode());
            self::assertSame('Le bot n\'a pas l\'intent « Server Members » : les membres du Discord ne peuvent pas être listés.', $exception->getMessage());
        }
    }

    private function catalog(HttpClientInterface $client, UserRepository $users, string $guildId = 'guild-1'): GuildMemberCatalog
    {
        return new GuildMemberCatalog(
            discordApi: new DiscordApi($client, 'bot-token'),
            roleMap: new JobRoleMap('role-maire', 'role-adjoint', 'role-secretaire'),
            users: $users,
            guildId: $guildId,
        );
    }
}
