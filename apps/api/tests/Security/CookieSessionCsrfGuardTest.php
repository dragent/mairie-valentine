<?php

declare(strict_types=1);

namespace App\Tests\Security;

use App\Security\BrowserSession;
use App\Security\CookieSessionCsrfGuard;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\HttpKernelInterface;

final class CookieSessionCsrfGuardTest extends TestCase
{
    public function testACookieMutationFromAnotherSiteIsRefused(): void
    {
        $event = $this->event('POST', 'https://evil.example', true);

        $this->guard()->onKernelRequest($event);

        self::assertSame(403, $event->getResponse()?->getStatusCode());
    }

    public function testACookieMutationFromTheTownHallIsAllowed(): void
    {
        $event = $this->event('POST', 'http://localhost:3000', true);

        $this->guard()->onKernelRequest($event);

        self::assertNull($event->getResponse());
    }

    public function testABearerRequestDoesNotNeedTheTownHallOrigin(): void
    {
        $event = $this->event('POST', null, true, true);

        $this->guard()->onKernelRequest($event);

        self::assertNull($event->getResponse());
    }

    public function testASafeCookieRequestIsNotTreatedAsAMutation(): void
    {
        $event = $this->event('GET', 'https://evil.example', true);

        $this->guard()->onKernelRequest($event);

        self::assertNull($event->getResponse());
    }

    private function guard(): CookieSessionCsrfGuard
    {
        return new CookieSessionCsrfGuard('http://localhost:3000');
    }

    private function event(string $method, ?string $origin, bool $cookie, bool $bearer = false): RequestEvent
    {
        $server = [];
        if (null !== $origin) {
            $server['HTTP_ORIGIN'] = $origin;
        }
        if ($bearer) {
            $server['HTTP_AUTHORIZATION'] = 'Bearer signed-token';
        }

        $request = Request::create(
            '/api/notes',
            $method,
            [],
            $cookie ? [BrowserSession::COOKIE => 'signed-token'] : [],
            [],
            $server,
        );

        return new RequestEvent(
            $this->createMock(HttpKernelInterface::class),
            $request,
            HttpKernelInterface::MAIN_REQUEST,
        );
    }
}
