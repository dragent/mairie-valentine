<?php

declare(strict_types=1);

namespace App\Service;

/**
 * The promotion was refused before Discord or the register were touched.
 */
final class JobAssignmentException extends \RuntimeException
{
}
