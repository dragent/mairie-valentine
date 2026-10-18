<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Decree;
use App\Entity\MunicipalEvent;
use App\Service\PublicBoard;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class PublicBoardController extends AbstractController
{
    public function __construct(private readonly PublicBoard $board)
    {
    }

    #[Route('/api/public/board', name: 'api_public_board', methods: ['GET'])]
    public function __invoke(EntityManagerInterface $entities): JsonResponse
    {
        $now = new \DateTimeImmutable('now', new \DateTimeZone('Europe/Paris'));

        return $this->json([
            'decrees' => $this->board->decrees($entities->getRepository(Decree::class)->findAll(), $now),
            'events' => $this->board->events($entities->getRepository(MunicipalEvent::class)->findAll(), $now),
        ]);
    }
}
