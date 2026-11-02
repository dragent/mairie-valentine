<?php

declare(strict_types=1);

namespace App\Tests\State;

use ApiPlatform\Metadata\Post;
use App\Entity\IdentityCard;
use App\Service\IdentityCardRegister;
use App\State\CloseIdentityCardRegisterProcessor;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Query;
use PHPUnit\Framework\TestCase;

final class CloseIdentityCardRegisterProcessorTest extends TestCase
{
    public function testTheMayorsMeetingEmptiesTheRegister(): void
    {
        $query = $this->createMock(Query::class);
        $query->expects(self::once())->method('execute')->willReturn(2);

        $entities = $this->createMock(EntityManagerInterface::class);
        $entities->expects(self::once())
            ->method('createQuery')
            ->with('DELETE FROM '.IdentityCard::class.' card')
            ->willReturn($query);

        $processor = new CloseIdentityCardRegisterProcessor(new IdentityCardRegister($entities));

        self::assertNull($processor->process(null, new Post(), [], []));
    }
}
