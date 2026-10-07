<?php

declare(strict_types=1);

namespace App\Service;

/**
 * Posters are public files under public/uploads. The name is random so the
 * original filename never reaches the disk.
 */
final readonly class EventPosterStore
{
    private const MAX_BYTES = 5_242_880;

    private const EXTENSIONS = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    public function __construct(private string $directory)
    {
    }

    public function store(string $pathname): string
    {
        if (!is_file($pathname)) {
            throw new EventPosterException('Choisissez une affiche.');
        }

        $size = filesize($pathname);

        if (false === $size || $size > self::MAX_BYTES) {
            throw new EventPosterException('L\'affiche ne peut dépasser 5 Mo.');
        }

        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($pathname);
        $extension = self::EXTENSIONS[$mime] ?? null;

        if (null === $extension) {
            throw new EventPosterException('L\'affiche doit être une image JPEG, PNG ou WebP.');
        }

        if (!is_dir($this->directory) && !mkdir($this->directory, 0775, true) && !is_dir($this->directory)) {
            throw new EventPosterException('L\'affiche n\'a pas pu être enregistrée.');
        }

        $name = bin2hex(random_bytes(16)).'.'.$extension;
        $target = $this->directory.'/'.$name;

        if (!copy($pathname, $target)) {
            throw new EventPosterException('L\'affiche n\'a pas pu être enregistrée.');
        }

        return 'uploads/events/'.$name;
    }

    public function delete(?string $publicPath): void
    {
        if (1 !== preg_match('#\Auploads/events/[a-f0-9]{32}\.(jpg|png|webp)\z#', (string) $publicPath)) {
            return;
        }

        $file = $this->directory.'/'.basename((string) $publicPath);

        if (is_file($file)) {
            unlink($file);
        }
    }
}
