<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\DatabaseBackup;
use PHPUnit\Framework\TestCase;

final class DatabaseBackupTest extends TestCase
{
    public function testThePasswordStaysOutOfTheProcessArguments(): void
    {
        $directory = sys_get_temp_dir().'/mairie-backup-'.bin2hex(random_bytes(4));
        mkdir($directory);

        try {
            $plan = (new DatabaseBackup())->plan([
                'DB_HOST' => 'db',
                'DB_USER' => 'mairie',
                'DB_PASSWORD' => "s3cret-value",
                'DB_NAME' => 'mairie_valentine',
            ], $directory);

            $command = implode(' ', $plan['command']);
            self::assertStringNotContainsString('s3cret-value', $command);
            self::assertStringContainsString('password="s3cret-value"', $plan['defaultsContents']);
            self::assertStringEndsWith('.sql', $plan['dumpFile']);
            self::assertFileExists($plan['defaultsFile']);
            self::assertSame(0600, fileperms($plan['defaultsFile']) & 0777);

            (new DatabaseBackup())->discard($plan['defaultsFile']);
            self::assertFileDoesNotExist($plan['defaultsFile']);
        } finally {
            $this->removeDirectory($directory);
        }
    }

    public function testAMissingCredentialIsRefused(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('DB_PASSWORD is required.');

        (new DatabaseBackup())->plan([
            'DB_HOST' => 'db',
            'DB_USER' => 'mairie',
            'DB_PASSWORD' => '',
            'DB_NAME' => 'mairie_valentine',
        ], sys_get_temp_dir());
    }

    public function testTheOperatorScriptDoesNotEmbedAPassword(): void
    {
        foreach (['backup-database.sh', 'restore-database.sh'] as $name) {
            $script = (string) file_get_contents(dirname(__DIR__, 2).'/bin/'.$name);

            self::assertStringContainsString('--defaults-extra-file', $script, $name);
            self::assertStringContainsString('trap ', $script, $name);
            self::assertStringContainsString('umask 077', $script, $name);
            self::assertDoesNotMatchRegularExpression('/-p[\'"$]/', $script, $name);
            self::assertDoesNotMatchRegularExpression('/password\s*=\s*[\'"][^\'"$]+[\'"]/i', $script, $name);
        }
    }

    private function removeDirectory(string $directory): void
    {
        foreach (array_merge(glob($directory.'/*') ?: [], glob($directory.'/.*') ?: []) as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }

        rmdir($directory);
    }
}
