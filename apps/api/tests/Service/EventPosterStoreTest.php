<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\EventPosterException;
use App\Service\EventPosterStore;
use PHPUnit\Framework\TestCase;

final class EventPosterStoreTest extends TestCase
{
    private string $directory;

    protected function setUp(): void
    {
        $this->directory = sys_get_temp_dir().'/event-posters-'.bin2hex(random_bytes(4));
    }

    protected function tearDown(): void
    {
        if (!is_dir($this->directory)) {
            return;
        }

        foreach (glob($this->directory.'/*') ?: [] as $file) {
            unlink($file);
        }

        rmdir($this->directory);
    }

    public function testAPngIsStoredUnderARandomName(): void
    {
        $stored = $this->store()->store($this->png());

        self::assertMatchesRegularExpression('#\Auploads/events/[a-f0-9]{32}\.png\z#', $stored);
        self::assertFileExists($this->directory.'/'.basename($stored));
    }

    public function testAnythingOtherThanAnImageIsRefused(): void
    {
        $text = $this->directory.'/note.txt';
        mkdir($this->directory);
        file_put_contents($text, 'pas une affiche');

        $this->expectException(EventPosterException::class);
        $this->expectExceptionMessage('L\'affiche doit être une image JPEG, PNG ou WebP.');

        $this->store()->store($text);
    }

    public function testAnOversizedFileIsRefusedBeforeItIsKept(): void
    {
        $huge = tempnam(sys_get_temp_dir(), 'poster');
        self::assertIsString($huge);
        file_put_contents($huge, str_repeat('x', 5_242_881));

        try {
            $this->store()->store($huge);
            self::fail('An oversized poster should be refused.');
        } catch (EventPosterException $exception) {
            self::assertSame('L\'affiche ne peut dépasser 5 Mo.', $exception->getMessage());
            self::assertDirectoryDoesNotExist($this->directory);
        } finally {
            unlink($huge);
        }
    }

    public function testDeleteRemovesOnlyAPosterThisStoreWrote(): void
    {
        $store = $this->store();
        $stored = $store->store($this->png());
        $file = $this->directory.'/'.basename($stored);

        $store->delete('../.env');
        $store->delete('uploads/events/not-a-poster.png');
        self::assertFileExists($file);

        $store->delete($stored);
        self::assertFileDoesNotExist($file);
    }

    private function store(): EventPosterStore
    {
        return new EventPosterStore($this->directory);
    }

    private function png(): string
    {
        $path = tempnam(sys_get_temp_dir(), 'poster');
        self::assertIsString($path);
        file_put_contents($path, base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            true,
        ));

        return $path;
    }
}
