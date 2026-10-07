<?php

declare(strict_types=1);

namespace App\Tests\Enum;

use App\Enum\NoteStatus;
use PHPUnit\Framework\TestCase;

final class NoteStatusTest extends TestCase
{
    public function testOfficeKeepsCurrentMemosOnTheDesk(): void
    {
        self::assertSame('current', NoteStatus::CURRENT->value);
        self::assertSame('Au greffe', NoteStatus::CURRENT->label());
    }

    public function testFiledMemosAreArchived(): void
    {
        self::assertSame('archived', NoteStatus::ARCHIVED->value);
        self::assertSame('Archivée', NoteStatus::ARCHIVED->label());
    }
}
