<?php

declare(strict_types=1);

namespace App\Security;

use Lexik\Bundle\JWTAuthenticationBundle\Security\Http\Cookie\JWTCookieProvider;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * The browser session is an HttpOnly cookie. The JWT never appears in the
 * address bar, in an access log, or in a place JavaScript can read.
 */
final class BrowserSession
{
    public const COOKIE = 'mairie_session';

    public function __construct(
        #[Autowire(service: 'lexik_jwt_authentication.cookie_provider.mairie_session')]
        private readonly JWTCookieProvider $cookies,
        #[Autowire('%env(FRONTEND_URL)%')]
        private readonly string $frontendUrl,
        #[Autowire('%app.session_cookie.secure%')]
        private readonly bool $secure,
        #[Autowire('%app.session_cookie.samesite%')]
        private readonly string $sameSite,
    ) {
    }

    public function establish(string $jwt): RedirectResponse
    {
        $response = new RedirectResponse($this->callbackUrl());
        $response->headers->setCookie($this->cookies->createCookie($jwt, self::COOKIE));

        return $response;
    }

    public function reject(string $error): RedirectResponse
    {
        return new RedirectResponse($this->callbackUrl(['error' => $error]));
    }

    public function end(): Response
    {
        $response = new Response(null, Response::HTTP_NO_CONTENT);
        $response->headers->clearCookie(self::COOKIE, '/', null, $this->secure, true, $this->sameSite);

        return $response;
    }

    /**
     * @param array<string, string> $query
     */
    private function callbackUrl(array $query = []): string
    {
        $url = rtrim($this->frontendUrl, '/').'/auth/callback';

        if ([] === $query) {
            return $url;
        }

        return $url.'?'.http_build_query($query);
    }
}
