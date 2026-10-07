<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Security\Discord\DiscordApi;
use App\Security\Discord\DiscordApiException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpExceptionInterface;

/**
 * The mayor promotes people by Discord id. An account is created for a guild
 * member who has never opened the portal; the position itself is applied later
 * by {@see JobAssigner}.
 */
final readonly class PromotionTargetResolver
{
    public function __construct(
        private UserRepository $users,
        private DiscordApi $discordApi,
        private EntityManagerInterface $entityManager,
        #[Autowire('%env(DISCORD_GUILD_ID)%')]
        private string $guildId,
    ) {
    }

    public function fromDiscordId(string $discordId): User
    {
        $discordId = trim($discordId);

        if (1 !== preg_match('/^\d{1,32}$/', $discordId)) {
            throw new BadRequestHttpException('Identifiant Discord invalide.');
        }

        $existing = $this->users->findOneByDiscordId($discordId);

        if ($existing instanceof User) {
            return $existing;
        }

        if (!$this->canReadGuild()) {
            throw new NotFoundHttpException('Ce compte est introuvable.');
        }

        try {
            $member = $this->discordApi->fetchGuildMember($this->guildId, $discordId);
        } catch (DiscordApiException $exception) {
            throw new HttpException(502, $exception->getMessage(), $exception);
        } catch (HttpExceptionInterface $exception) {
            throw new HttpException(502, 'Discord est injoignable, la fonction n\'a pas été modifiée.', $exception);
        }

        if (null === $member) {
            throw new UnprocessableEntityHttpException('Cette personne n\'est pas membre du serveur Discord.');
        }

        $user = new User($member->discordId, $member->username);
        $user
            ->setDisplayName($member->displayName)
            ->setAvatarUrl($member->avatarUrl);
        $this->entityManager->persist($user);

        return $user;
    }

    private function canReadGuild(): bool
    {
        return '' !== $this->guildId && $this->discordApi->hasBotToken();
    }
}
