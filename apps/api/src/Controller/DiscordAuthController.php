<?php

declare(strict_types=1);

namespace App\Controller;

use App\Security\BrowserSession;
use App\Security\Discord\DiscordApi;
use App\Security\Discord\DiscordUserProvisioner;
use App\Security\Discord\InvalidDiscordIdentity;
use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use KnpU\OAuth2ClientBundle\Client\OAuth2Client;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use League\OAuth2\Client\Provider\Exception\IdentityProviderException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpExceptionInterface;
use Wohali\OAuth2\Client\Provider\DiscordResourceOwner;

/**
 * Discord is the only identity provider: the API never stores a password.
 *
 * The browser is sent to /auth/discord, comes back on /auth/discord/check, and
 * is redirected to the front-end. The JWT is set as an HttpOnly cookie and is
 * not put in the URL.
 */
#[Route('/auth/discord')]
final class DiscordAuthController extends AbstractController
{
    /** @var list<string> */
    private const SCOPES = ['identify', 'email', 'guilds'];

    public function __construct(
        private readonly ClientRegistry $clientRegistry,
        private readonly DiscordUserProvisioner $provisioner,
        private readonly DiscordApi $discordApi,
        private readonly JWTTokenManagerInterface $jwtManager,
        private readonly BrowserSession $session,
        #[Autowire('%env(DISCORD_GUILD_ID)%')]
        private readonly string $requiredGuildId,
    ) {
    }

    #[Route('', name: 'auth_discord_start', methods: ['GET'])]
    public function start(): RedirectResponse
    {
        return $this->discordClient()->redirect(self::SCOPES);
    }

    #[Route('/check', name: 'auth_discord_check', methods: ['GET'])]
    public function check(): RedirectResponse
    {
        $client = $this->discordClient();

        try {
            $accessToken = $client->getAccessToken();
            /** @var DiscordResourceOwner $owner */
            $owner = $client->fetchUserFromToken($accessToken);
        } catch (IdentityProviderException|\RuntimeException) {
            return $this->session->reject('discord_handshake_failed');
        }

        if ('' !== $this->requiredGuildId) {
            try {
                if (!$this->discordApi->isGuildMember($accessToken->getToken(), $this->requiredGuildId)) {
                    return $this->session->reject('not_a_guild_member');
                }
            } catch (HttpExceptionInterface) {
                return $this->session->reject('discord_unavailable');
            }
        }

        try {
            $user = $this->provisioner->provision($owner);
        } catch (InvalidDiscordIdentity) {
            return $this->session->reject('invalid_discord_account');
        }

        return $this->session->establish($this->jwtManager->create($user));
    }

    #[Route('/logout', name: 'auth_logout', methods: ['POST'])]
    public function logout(): Response
    {
        return $this->session->end();
    }

    private function discordClient(): OAuth2Client
    {
        return $this->clientRegistry->getClient('discord');
    }

}
