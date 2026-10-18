<?php

declare(strict_types=1);

namespace App\Tests\Security;

use App\Entity\Decree;
use App\Entity\User;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Serializer\Attribute\Groups;

final class SensitiveFieldExposureTest extends TestCase
{
    #[DataProvider('serverOwnedFields')]
    public function testTheClientCannotWriteAServerOwnedField(string $class, string $property): void
    {
        $groups = $this->serializationGroups($class, $property);

        self::assertNotContains('decree:write', $groups);
        self::assertNotContains('note:write', $groups);
        self::assertNotContains('appointment:write', $groups);
        self::assertNotContains('event:write', $groups);
        self::assertNotContains('user:write', $groups);
    }

    public function testAnAccountDoesNotPublishItsEmailOrItsStoredRoles(): void
    {
        self::assertSame([], $this->serializationGroups(User::class, 'email'));
        self::assertSame([], $this->serializationGroups(User::class, 'roles'));
        self::assertSame(['user:read'], $this->serializationGroups(User::class, 'job'));
    }

    /**
     * @return list<array{string, string}>
     */
    public static function serverOwnedFields(): array
    {
        return [
            [Decree::class, 'reference'],
            [Decree::class, 'posterPath'],
            [User::class, 'discordId'],
            [User::class, 'roles'],
            [User::class, 'job'],
        ];
    }

    /**
     * @return list<string>
     */
    private function serializationGroups(string $class, string $property): array
    {
        $groups = [];
        foreach ((new \ReflectionClass($class))->getProperty($property)->getAttributes(Groups::class) as $attribute) {
            $groups = [...$groups, ...$attribute->newInstance()->groups];
        }

        return $groups;
    }
}
