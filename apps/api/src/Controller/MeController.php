<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Role\RoleHierarchyInterface;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

final class MeController extends AbstractController
{
    public function __construct(private readonly RoleHierarchyInterface $roleHierarchy)
    {
    }

    #[Route('/api/me', name: 'api_me', methods: ['GET'])]
    public function __invoke(#[CurrentUser] User $user): JsonResponse
    {
        return $this->json([
            'id' => $user->getId(),
            'discordId' => $user->getDiscordId(),
            'username' => $user->getUsername(),
            'displayName' => $user->getDisplayName(),
            'email' => $user->getEmail(),
            'avatarUrl' => $user->getAvatarUrl(),
            'job' => $user->getJob()?->value,
            'jobLabel' => $user->getJob()?->label(),
            // Flattened through the hierarchy: the front-end then tests a role
            // exactly like the API does, without duplicating security.yaml.
            'roles' => $this->roleHierarchy->getReachableRoleNames($user->getRoles()),
            'lastLoginAt' => $user->getLastLoginAt()?->format(\DATE_ATOM),
        ]);
    }
}
