<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\AuthoredEntity;
use App\Entity\User;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\AsDecorator;
use Symfony\Component\DependencyInjection\Attribute\AutowireDecorated;

/**
 * Stamps the signed-in account and the modification date on everything written
 * in the workspace, so neither can be forged through the payload.
 *
 * @implements ProcessorInterface<object, object>
 */
#[AsDecorator('api_platform.doctrine.orm.state.persist_processor')]
final readonly class AuthoredPersistProcessor implements ProcessorInterface
{
    public function __construct(
        #[AutowireDecorated]
        private ProcessorInterface $decorated,
        private Security $security,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($data instanceof AuthoredEntity) {
            $author = $this->security->getUser();

            if (null === $data->getAuthor() && $author instanceof User) {
                $data->setAuthor($author);
            }

            $data->markUpdated();
        }

        return $this->decorated->process($data, $operation, $uriVariables, $context);
    }
}
