#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Symfony's assets:install renames the previous bundle directory aside and then
 * deletes it. On Docker bind mounts (especially Windows) that rmdir often fails
 * with "Directory not empty", which aborts `composer install`. Wiping the
 * destination first keeps the auto-script reliable.
 */
$bundlesDir = dirname(__DIR__).'/public/bundles';

if (!is_dir($bundlesDir)) {
    exit(0);
}

$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($bundlesDir, FilesystemIterator::SKIP_DOTS),
    RecursiveIteratorIterator::CHILD_FIRST,
);

foreach ($iterator as $node) {
    if ($node->isDir()) {
        @rmdir($node->getPathname());
    } else {
        @unlink($node->getPathname());
    }
}

@rmdir($bundlesDir);

exit(0);
