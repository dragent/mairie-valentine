<?php

declare(strict_types=1);

namespace App\Tests\Security;

use App\Security\BrowserSession;
use Lexik\Bundle\JWTAuthenticationBundle\Security\Http\Cookie\JWTCookieProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Cookie;

final class BrowserSessionTest extends TestCase
{
    public function testTheJwtStaysInAnHttpOnlyCookieAndOutOfTheUrl(): void
    {
        $response = $this->session()->establish('aaa.bbb.ccc');

        self::assertSame('http://localhost:3000/auth/callback', $response->getTargetUrl());
        self::assertStringNotContainsString('aaa.bbb.ccc', $response->getTargetUrl());

        $cookies = $response->headers->getCookies();
        self::assertCount(1, $cookies);
        self::assertSame(BrowserSession::COOKIE, $cookies[0]->getName());
        self::assertSame('aaa.bbb.ccc', $cookies[0]->getValue());
        self::assertTrue($cookies[0]->isHttpOnly());
        self::assertFalse($cookies[0]->isSecure());
        self::assertSame(Cookie::SAMESITE_LAX, $cookies[0]->getSameSite());
    }

    public function testAFailedLoginDoesNotSetASession(): void
    {
        $response = $this->session()->reject('not_a_guild_member');

        self::assertSame(
            'http://localhost:3000/auth/callback?error=not_a_guild_member',
            $response->getTargetUrl(),
        );
        self::assertSame([], $response->headers->getCookies());
    }

    public function testEndingTheSessionExpiresTheCookie(): void
    {
        $response = $this->session()->end();

        self::assertSame(204, $response->getStatusCode());
        $cookies = $response->headers->getCookies();
        self::assertCount(1, $cookies);
        self::assertSame(BrowserSession::COOKIE, $cookies[0]->getName());
        self::assertTrue($cookies[0]->isCleared());
        self::assertTrue($cookies[0]->isHttpOnly());
    }

    private function session(): BrowserSession
    {
        return new BrowserSession(
            new JWTCookieProvider(BrowserSession::COOKIE, 3600, Cookie::SAMESITE_LAX, '/', null, false, true),
            'http://localhost:3000',
            false,
            Cookie::SAMESITE_LAX,
        );
    }
}
