<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Dto\JobAssignment;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Security\Discord\DiscordApiException;
use App\Service\JobAssigner;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Handles the mayor's promotions. The guild roles are rewritten first, so a
 * Discord that refuses the change leaves the register untouched and answers
 * 502 rather than pretending the promotion happened.
 *
 * @implements ProcessorInterface<JobAssignment, User>
 */
final readonly class AssignJobProcessor implements ProcessorInterface
{
    public function __construct(
        private UserRepository $users,
        private JobAssigner $jobAssigner,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): User
    {
        $target = $this->users->find($uriVariables['id'] ?? null);

        if (!$target instanceof User) {
            throw new NotFoundHttpException('Ce compte est introuvable.');
        }

        try {
            $this->jobAssigner->assign($target, $data->job);
        } catch (DiscordApiException $exception) {
            throw new HttpException(Response::HTTP_BAD_GATEWAY, $exception->getMessage(), $exception);
        }

        return $target;
    }
}
