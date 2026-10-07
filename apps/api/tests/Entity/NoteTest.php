<?php

declare(strict_types=1);

namespace App\Tests\Entity;

use App\Entity\Note;
use App\Entity\User;
use App\Enum\Job;
use App\Enum\NoteStatus;
use PHPUnit\Framework\TestCase;

final class NoteTest extends TestCase
{
    public function testBylineNamesTheAuthorsOffice(): void
    {
        $mayor = new User('1', 'arthur');
        $mayor->setJob(Job::MAIRE);
        $mayor->setDisplayName('Arthur Callahan');

        $note = new Note();
        $note->setAuthor($mayor);

        self::assertSame('Arthur Callahan', $note->getAuthorName());
        self::assertSame('Maire', $note->getAuthorJobLabel());
    }

    public function testBylineStaysEmptyWithoutAnAuthor(): void
    {
        $note = new Note();

        self::assertNull($note->getAuthorName());
        self::assertNull($note->getAuthorJobLabel());
    }

    public function testAFreshMemoStaysOnTheDesk(): void
    {
        $note = new Note();

        self::assertSame(NoteStatus::CURRENT, $note->getStatus());
    }

    public function testAMemoCanBeFiledInTheArchive(): void
    {
        $note = new Note();
        $note->setStatus(NoteStatus::ARCHIVED);

        self::assertSame(NoteStatus::ARCHIVED, $note->getStatus());
    }
}
