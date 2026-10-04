<?php

declare(strict_types=1);

namespace App\Controller;

use App\Security\Discord\DiscordApi;
use App\Security\Discord\DiscordUserProvisioner;
use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use KnpU\OAuth2ClientBundle\Client\OAuth2Client;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use League\OAuth2\Client\Provider\Exception\IdentityProviderException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpExceptionInterface;
use Wohali\OAuth2\Client\Provider\DiscordResourceOwner;

/**
 * Discord is the only identity provider: the API never stores a password.
 *
 * The browser is sent to /auth/discord, comes back on /auth/discord/check, and
 * is finally redirected to the front-end with a JWT in the URL fragment. A
 * fragment is used rather than a query string because it is not sent to the
 * server and therefore never ends up in access logs.
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
        #[Autowire('%env(FRONTEND_URL)%')]
        private readonly string $frontendUrl,
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
            return $this->backToFrontend(['error' => 'discord_handshake_failed']);
        }

        if ('' !== $this->requiredGuildId) {
            try {
                if (!$this->discordApi->isGuildMember($accessToken->getToken(), $this->requiredGuildId)) {
                    return $this->backToFrontend(['error' => 'not_a_guild_member']);
                }
            } catch (HttpExceptionInterface) {
                return $this->backToFrontend(['error' => 'discord_unavailable']);
            }
        }

        $user = $this->provisioner->provision($owner);

        return $this->backToFrontend(['token' => $this->jwtManager->create($user)]);
    }

    private function discordClient(): OAuth2Client
    {
        return $this->clientRegistry->getClient('discord');
    }

    /**
     * @param array<string, string> $fragment
     */
    private function backToFrontend(array $fragment): RedirectResponse
    {
        return new RedirectResponse(\sprintf(
            '%s/auth/callback#%s',
            rtrim($this->frontendUrl, '/'),
            http_build_query($fragment),
        ));
    }
}
