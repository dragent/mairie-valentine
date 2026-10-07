<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\GuildMemberCatalog;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

final class GuildMemberController extends AbstractController
{
    public function __construct(private readonly GuildMemberCatalog $catalog)
    {
    }

    #[Route('/api/guild-members', name: 'api_guild_members', methods: ['GET'])]
    #[IsGranted('ROLE_ELU')]
    public function __invoke(): JsonResponse
    {
        try {
            return $this->json($this->catalog->list());
        } catch (HttpException $exception) {
            return $this->json(['detail' => $exception->getMessage()], $exception->getStatusCode());
        }
    }
}
