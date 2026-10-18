<?php

declare(strict_types=1);

namespace App\Tests\Dto;

use App\Dto\JobAssignment;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Validator\Validation;

final class JobAssignmentValidationTest extends TestCase
{
    public function testAPromotionNamesADiscordAccountByItsSnowflake(): void
    {
        $assignment = new JobAssignment();
        $assignment->discordId = 'ROLE_MAIRE';

        $violations = Validation::createValidatorBuilder()
            ->enableAttributeMapping()
            ->getValidator()
            ->validate($assignment);

        self::assertGreaterThan(0, \count($violations));
        self::assertSame('Identifiant Discord invalide.', $violations->get(0)->getMessage());
    }

    public function testPatchingByIdentifierDoesNotRequireADiscordId(): void
    {
        $violations = Validation::createValidatorBuilder()
            ->enableAttributeMapping()
            ->getValidator()
            ->validate(new JobAssignment());

        self::assertCount(0, $violations);
    }
}
