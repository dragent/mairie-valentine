<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Security\Discord\DiscordApi;
use App\Service\PromotionTargetResolver;
use App\Tests\Support\DiscordHttpMock;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Contracts\HttpClient\HttpClientInterface;

final class PromotionTargetResolverTest extends TestCase
{
    use DiscordHttpMock;

    public function testReusesAnAccountThatAlreadySignedIn(): void
    {
        $user = new User('42', 'ada');
        $users = $this->createMock(UserRepository::class);
        $users->method('findOneByDiscordId')->with('42')->willReturn($user);

        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->never())->method('request');
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects($this->never())->method('persist');

        $resolved = $this->resolver($client, $users, $entityManager)->fromDiscordId(' 42 ');

        self::assertSame($user, $resolved);
    }

    public function testRejectsAnInvalidDiscordId(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->never())->method('request');
        $resolver = $this->resolver($client, $this->createMock(UserRepository::class), $this->createMock(EntityManagerInterface::class));

        foreach (['', 'abc', '12a', str_repeat('1', 33)] as $discordId) {
            try {
                $resolver->fromDiscordId($discordId);
                self::fail($discordId.' should be rejected.');
            } catch (BadRequestHttpException $exception) {
                self::assertSame('Identifiant Discord invalide.', $exception->getMessage());
            }
        }
    }

    public function testCreatesAnAccountFromAGuildMemberWhoNeverSignedIn(): void
    {
        $users = $this->createMock(UserRepository::class);
        $users->method('findOneByDiscordId')->with('55')->willReturn(null);

        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->once())
            ->method('request')
            ->with('GET', 'https://discord.com/api/v10/guilds/guild-1/members/55')
            ->willReturn($this->discordResponse(200, [
                'nick' => 'Ada N.',
                'roles' => ['role-adjoint'],
                'user' => [
                    'id' => '55',
                    'username' => 'ada',
                    'global_name' => 'Ada Lovelace',
                    'avatar' => 'abc',
                ],
            ]));

        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects($this->once())
            ->method('persist')
            ->with(self::callback(function (User $user): bool {
                self::assertSame('55', $user->getDiscordId());
                self::assertSame('ada', $user->getUsername());
                self::assertSame('Ada Lovelace', $user->getDisplayName());
                self::assertSame('https://cdn.discordapp.com/avatars/55/abc.png?size=128', $user->getAvatarUrl());

                return true;
            }));
        $entityManager->expects($this->never())->method('flush');

        $resolved = $this->resolver($client, $users, $entityManager)->fromDiscordId('55');

        self::assertSame('55', $resolved->getDiscordId());
        self::assertNull($resolved->getJob());
    }

    public function testRejectsSomeoneWhoIsNotInTheGuild(): void
    {
        $users = $this->createMock(UserRepository::class);
        $users->method('findOneByDiscordId')->willReturn(null);
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects($this->never())->method('persist');

        $client = $this->createMock(HttpClientInterface::class);
        $client->method('request')->willReturn($this->discordResponse(404));

        $this->expectException(UnprocessableEntityHttpException::class);
        $this->expectExceptionMessage('Cette personne n\'est pas membre du serveur Discord.');

        $this->resolver($client, $users, $entityManager)->fromDiscordId('99');
    }

    public function testUnknownAccountCannotBeCreatedWhenDiscordIsNotConfigured(): void
    {
        $users = $this->createMock(UserRepository::class);
        $users->method('findOneByDiscordId')->willReturn(null);
        $client = $this->createMock(HttpClientInterface::class);
        $client->expects($this->never())->method('request');

        $this->expectException(NotFoundHttpException::class);
        $this->expectExceptionMessage('Ce compte est introuvable.');

        $this->resolver($client, $users, $this->createMock(EntityManagerInterface::class), guildId: '')
            ->fromDiscordId('99');
    }

    private function resolver(
        HttpClientInterface $client,
        UserRepository $users,
        EntityManagerInterface $entityManager,
        string $guildId = 'guild-1',
        string $botToken = 'bot-token',
    ): PromotionTargetResolver {
        return new PromotionTargetResolver(
            users: $users,
            discordApi: new DiscordApi($client, $botToken),
            entityManager: $entityManager,
            guildId: $guildId,
        );
    }
}
