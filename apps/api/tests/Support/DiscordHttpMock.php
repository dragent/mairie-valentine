<?php

declare(strict_types=1);

namespace App\Tests\Support;

use PHPUnit\Framework\MockObject\MockObject;
use Symfony\Contracts\HttpClient\ResponseInterface;

trait DiscordHttpMock
{
    /**
     * @param array<string, mixed> $data
     *
     * @return ResponseInterface&MockObject
     */
    private function discordResponse(int $status, array $data = []): ResponseInterface
    {
        $response = $this->createMock(ResponseInterface::class);
        $response->method('getStatusCode')->willReturn($status);
        $response->method('toArray')->willReturn($data);

        return $response;
    }
}
