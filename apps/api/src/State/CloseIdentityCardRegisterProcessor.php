<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Service\IdentityCardRegister;

/**
 * Empties the identity-card tally after a mayors' meeting.
 *
 * @implements ProcessorInterface<mixed, null>
 */
final readonly class CloseIdentityCardRegisterProcessor implements ProcessorInterface
{
    public function __construct(private IdentityCardRegister $register)
    {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        $this->register->close();

        return null;
    }
}
