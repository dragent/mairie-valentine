<?php

declare(strict_types=1);

namespace App\Tests\Security;

use PHPUnit\Framework\TestCase;

final class CommittedSecretTest extends TestCase
{
    public function testDevEnvironmentFileDoesNotCarryAnApplicationSecret(): void
    {
        $contents = (string) file_get_contents(dirname(__DIR__, 2).'/.env.dev');

        self::assertDoesNotMatchRegularExpression(
            '/^APP_SECRET=\S/m',
            $contents,
            'APP_SECRET must come from the server environment, not from a committed file.',
        );
    }
}
