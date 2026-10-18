<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Enum\DecreeStatus;
use App\Service\PublicCatalog;
use PHPUnit\Framework\TestCase;

final class PublicCatalogTest extends TestCase
{
    public function testThePublicBoardLoadsPublishedDecreesOnly(): void
    {
        self::assertSame(['status' => DecreeStatus::PUBLISHED], PublicCatalog::decreeCriteria());

        $controller = (string) file_get_contents(dirname(__DIR__, 2).'/src/Controller/PublicBoardController.php');

        self::assertStringContainsString('PublicCatalog::decreeCriteria()', $controller);
        self::assertStringNotContainsString('findAll()', $controller);
    }
}
