<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Entity\IdentityCard;
use App\Service\IdentityCardRegister;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Query;
use PHPUnit\Framework\TestCase;

final class IdentityCardRegisterTest extends TestCase
{
    public function testClosingTheRegisterDeletesEveryIssuance(): void
    {
        $query = $this->createMock(Query::class);
        $query->expects(self::once())->method('execute')->willReturn(3);

        $entities = $this->createMock(EntityManagerInterface::class);
        $entities->expects(self::never())->method('persist');
        $entities->expects(self::once())
            ->method('createQuery')
            ->with('DELETE FROM '.IdentityCard::class.' card')
            ->willReturn($query);

        self::assertSame(3, (new IdentityCardRegister($entities))->close());
    }
}
