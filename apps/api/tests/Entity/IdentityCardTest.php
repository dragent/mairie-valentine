<?php

declare(strict_types=1);

namespace App\Tests\Entity;

use App\Entity\IdentityCard;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Serializer\Attribute\Groups;

final class IdentityCardTest extends TestCase
{
    public function testAnIssuanceDoesNotNameTheHolder(): void
    {
        $card = new IdentityCard();

        self::assertNull($card->getId());

        foreach ((new \ReflectionClass(IdentityCard::class))->getProperties() as $property) {
            self::assertNotContains($property->getName(), ['citizenName', 'holderName', 'holder']);

            foreach ($property->getAttributes(Groups::class) as $attribute) {
                self::assertNotContains('identity_card:write', $attribute->newInstance()->groups);
            }
        }
    }
}
