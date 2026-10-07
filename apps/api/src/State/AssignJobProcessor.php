<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Dto\JobAssignment;
use App\Entity\User;
use App\Enum\Job;
use App\Repository\UserRepository;
use App\Security\Discord\DiscordApiException;
use App\Service\JobAssigner;
use App\Service\JobAssignmentException;
use App\Service\PromotionTargetResolver;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

/**
 * Handles promotions. Nobody may change their own position. The mayor may hand
 * out any other position; a deputy mayor may only recruit or dismiss a
 * secretary. The guild roles are rewritten first, so
 * a Discord that refuses the change leaves the register untouched and answers
 * 502 rather than pretending the promotion happened.
 *
 * @implements ProcessorInterface<JobAssignment, User>
 */
final readonly class AssignJobProcessor implements ProcessorInterface
{
    public function __construct(
        private UserRepository $users,
        private JobAssigner $jobAssigner,
        private PromotionTargetResolver $targets,
        private Security $security,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): User
    {
        if (\array_key_exists('id', $uriVariables) && null !== $uriVariables['id']) {
            $target = $this->users->find($uriVariables['id']);

            if (!$target instanceof User) {
                throw new NotFoundHttpException('Ce compte est introuvable.');
            }
        } else {
            $target = $this->targets->fromDiscordId((string) ($data->discordId ?? ''));
        }

        $this->assertCallerMayAssign($target, $data->job);

        try {
            $this->jobAssigner->assign($target, $data->job);
        } catch (JobAssignmentException $exception) {
            throw new UnprocessableEntityHttpException($exception->getMessage(), $exception);
        } catch (DiscordApiException $exception) {
            throw new HttpException(Response::HTTP_BAD_GATEWAY, $exception->getMessage(), $exception);
        }

        return $target;
    }

    /**
     * Deputies recruit secretaries among citizens, and may send a secretary
     * back to being a citizen. Naming a deputy or ceding the seat stays with
     * the mayor.
     */
    private function assertCallerMayAssign(User $target, ?Job $job): void
    {
        $caller = $this->security->getUser();

        if ($caller instanceof User && $caller->getDiscordId() === $target->getDiscordId()) {
            throw new AccessDeniedHttpException('Vous ne pouvez pas modifier votre propre fonction.');
        }

        if ($this->security->isGranted(User::ROLE_MAIRE)) {
            return;
        }

        $current = $target->getJob();
        $recruiting = Job::SECRETAIRE === $job && (null === $current || Job::SECRETAIRE === $current);
        $dismissing = null === $job && Job::SECRETAIRE === $current;

        if ($recruiting || $dismissing) {
            return;
        }

        throw new AccessDeniedHttpException('Le maire adjoint ne peut recruter ou retirer que des secrétaires.');
    }
}
