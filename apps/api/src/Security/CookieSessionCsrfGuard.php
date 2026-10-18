<?php

declare(strict_types=1);

namespace App\Security;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\RequestEvent;

/**
 * A cookie session is sent by the browser on its own. State-changing requests
 * that rely on it must come from the town hall site. A Bearer token is a
 * deliberate credential and is left to the firewall.
 */
final class CookieSessionCsrfGuard
{
    public function __construct(
        #[Autowire('%env(FRONTEND_URL)%')]
        private readonly string $frontendUrl,
    ) {
    }

    #[AsEventListener(priority: 30)]
    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();

        if ($request->isMethodSafe() || !$request->cookies->has(BrowserSession::COOKIE)) {
            return;
        }

        if ($request->headers->has('Authorization')) {
            return;
        }

        $origin = $request->headers->get('Origin');
        $allowed = rtrim($this->frontendUrl, '/');

        if (\is_string($origin) && rtrim($origin, '/') === $allowed && '' !== $allowed) {
            return;
        }

        $event->setResponse(new JsonResponse(['detail' => 'Origine refusée.'], JsonResponse::HTTP_FORBIDDEN));
    }
}
