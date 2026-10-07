<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Decree;
use App\Service\EventPosterException;
use App\Service\EventPosterStore;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

final class DecreePosterController extends AbstractController
{
    public function __construct(
        #[Autowire(service: 'app.decree_poster_store')]
        private readonly EventPosterStore $posters,
        private readonly EntityManagerInterface $entities,
    ) {
    }

    #[Route('/api/decrees/{id}/poster', name: 'api_decree_poster', methods: ['POST'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_ELU')]
    public function __invoke(Decree $decree, Request $request): JsonResponse
    {
        $poster = $request->files->get('poster');

        if (!$poster instanceof UploadedFile || !$poster->isValid()) {
            return $this->json(['detail' => 'Choisissez une affiche.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        try {
            $path = $this->posters->store($poster->getPathname());
        } catch (EventPosterException $exception) {
            return $this->json(['detail' => $exception->getMessage()], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $previous = $decree->getPosterPath();
        $decree->setPosterPath($path);
        $decree->markUpdated();

        try {
            $this->entities->flush();
        } catch (\Throwable $error) {
            $this->posters->delete($path);

            throw $error;
        }

        $this->posters->delete($previous);

        return $this->json([
            'id' => $decree->getId(),
            'posterPath' => $decree->getPosterPath(),
        ]);
    }
}
