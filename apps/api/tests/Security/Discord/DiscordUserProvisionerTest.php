<?php

declare(strict_types=1);

namespace App\Tests\Security\Discord;

use App\Entity\User;
use App\Enum\Job;
use App\Repository\UserRepository;
use App\Security\Discord\DiscordApi;
use App\Security\Discord\DiscordUserProvisioner;
use App\Security\Discord\JobRoleMap;
use App\Tests\Support\DiscordHttpMock;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpClient\Exception\TransportException;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Wohali\OAuth2\Client\Provider\DiscordResourceOwner;

final class DiscordUserProvisionerTest extends TestCase
{
    use DiscordHttpMock;

    public function testStoresTheServerNicknameInsteadOfTheDiscordName(): void
    {
        $users = $this->createMock(UserRepository::class);
        $users->method('findOneByDiscordId')->with('42')->willReturn(null);

        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->once())
            ->method('request')
            ->with('GET', 'https://discord.com/api/v10/guilds/guild-1/members/42')
            ->willReturn($this->discordResponse(200, [
                'nick' => 'William Harrington',
                'roles' => ['role-maire'],
                'user' => [
                    'id' => '42',
                    'username' => 'dragent0',
                    'global_name' => 'Alexis',
                ],
            ]));

        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects($this->once())->method('persist');
        $entityManager->expects($this->once())->method('flush');

        $user = $this->provisioner($client, $users, $entityManager)->provision($this->owner());

        self::assertSame('dragent0', $user->getUsername());
        self::assertSame('William Harrington', $user->getDisplayName());
        self::assertSame(Job::MAIRE, $user->getJob());
    }

    public function testKeepsTheDiscordDisplayNameWhenTheMemberHasNoServerNickname(): void
    {
        $users = $this->createMock(UserRepository::class);
        $users->method('findOneByDiscordId')->willReturn(null);

        $client = $this->createMock(HttpClientInterface::class);
        $client->method('request')->willReturn($this->discordResponse(200, [
            'nick' => null,
            'roles' => [],
            'user' => [
                'id' => '42',
                'username' => 'dragent0',
                'global_name' => 'Alexis',
            ],
        ]));

        $user = $this->provisioner($client, $users, $this->createMock(EntityManagerInterface::class))->provision($this->owner());

        self::assertSame('Alexis', $user->getDisplayName());
        self::assertNull($user->getJob());
    }

    public function testKeepsTheStoredNicknameWhenDiscordCannotBeReached(): void
    {
        $existing = new User('42', 'dragent0');
        $existing->setDisplayName('William Harrington');

        $users = $this->createMock(UserRepository::class);
        $users->method('findOneByDiscordId')->willReturn($existing);

        $client = $this->createMock(HttpClientInterface::class);
        $client->method('request')->willThrowException(new TransportException('Discord is down'));

        $user = $this->provisioner($client, $users, $this->createMock(EntityManagerInterface::class))->provision($this->owner());

        self::assertSame('William Harrington', $user->getDisplayName());
    }

    private function owner(): DiscordResourceOwner
    {
        $owner = $this->createMock(DiscordResourceOwner::class);
        $owner->method('getId')->willReturn('42');
        $owner->method('getUsername')->willReturn('dragent0');
        $owner->method('getEmail')->willReturn(null);
        $owner->method('toArray')->willReturn([
            'id' => '42',
            'username' => 'dragent0',
            'global_name' => 'Alexis',
            'avatar' => null,
        ]);

        return $owner;
    }

    private function provisioner(
        HttpClientInterface $client,
        UserRepository $users,
        EntityManagerInterface $entityManager,
    ): DiscordUserProvisioner {
        return new DiscordUserProvisioner(
            users: $users,
            entityManager: $entityManager,
            discordApi: new DiscordApi($client, 'bot-token'),
            roleMap: new JobRoleMap('role-maire', 'role-adjoint', 'role-secretaire'),
            guildId: 'guild-1',
        );
    }
}
