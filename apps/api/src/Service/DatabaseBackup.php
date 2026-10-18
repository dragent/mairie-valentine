<?php

declare(strict_types=1);

namespace App\Service;

/**
 * Plans a mysqldump whose password lives in a client defaults file, not in the
 * process arguments.
 */
final class DatabaseBackup
{
    /**
     * @param array<string, string> $env
     *
     * @return array{command: list<string>, defaultsFile: string, defaultsContents: string, dumpFile: string}
     */
    public function plan(array $env, string $directory): array
    {
        foreach (['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'] as $key) {
            $value = $env[$key] ?? '';

            if ('' === $value) {
                throw new \InvalidArgumentException($key.' is required.');
            }

            if (1 === preg_match('/[\r\n\0"]/', $value)) {
                throw new \InvalidArgumentException($key.' is invalid.');
            }
        }

        if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
            throw new \InvalidArgumentException('Backup directory is not writable.');
        }

        $stamp = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Ymd\THis\Z');
        $defaultsFile = $directory.'/.my.cnf';
        $dumpFile = $directory.'/'.$env['DB_NAME'].'-'.$stamp.'.sql';
        $defaultsContents = "[client]\nhost=\"{$env['DB_HOST']}\"\nuser=\"{$env['DB_USER']}\"\npassword=\"{$env['DB_PASSWORD']}\"\n";

        file_put_contents($defaultsFile, $defaultsContents);
        @chmod($defaultsFile, 0600);

        return [
            'command' => [
                'mysqldump',
                '--defaults-extra-file='.$defaultsFile,
                '--single-transaction',
                '--no-tablespaces',
                '--result-file='.$dumpFile,
                $env['DB_NAME'],
            ],
            'defaultsFile' => $defaultsFile,
            'defaultsContents' => $defaultsContents,
            'dumpFile' => $dumpFile,
        ];
    }

    /**
     * Removes the defaults file. Call this once the dump has finished, including
     * when the dump command failed.
     */
    public function discard(string $defaultsFile): void
    {
        if (is_file($defaultsFile)) {
            unlink($defaultsFile);
        }
    }
}
