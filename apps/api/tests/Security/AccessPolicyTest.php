<?php

declare(strict_types=1);

namespace App\Tests\Security;

use App\Controller\DecreePosterController;
use App\Controller\DiscordAuthController;
use App\Controller\EventPosterController;
use App\Controller\GuildMemberController;
use App\Controller\HealthController;
use App\Controller\MeController;
use App\Controller\PublicBoardController;
use App\Dto\JobAssignment;
use App\Entity\Appointment;
use App\Entity\Decree;
use App\Entity\MunicipalEvent;
use App\Entity\Note;
use App\Entity\User;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\HttpOperation;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Yaml\Yaml;

final class AccessPolicyTest extends TestCase
{
    public function testFirewallRequiresAnElectedOfficialForPersonnelAndDecrees(): void
    {
        /** @var array{security: array{access_control: list<array{path: string, roles: string}>}} $config */
        $config = Yaml::parseFile(dirname(__DIR__, 2).'/config/packages/security.yaml');
        $rules = [];

        foreach ($config['security']['access_control'] as $rule) {
            $rules[$rule['path']] = $rule['roles'];
        }

        self::assertSame(['ROLE_MAIRE'], $config['security']['role_hierarchy']['ROLE_ADMIN']);
        self::assertStringNotContainsString('ROLE_ALLOWED_TO_SWITCH', (string) file_get_contents(dirname(__DIR__, 2).'/config/packages/security.yaml'));

        self::assertSame([
            '^/auth/discord' => 'PUBLIC_ACCESS',
            '^/health$' => 'PUBLIC_ACCESS',
            '^/api/(docs|contexts|\.well-known)' => 'PUBLIC_ACCESS',
            '^/api$' => 'PUBLIC_ACCESS',
            '^/api/public' => 'PUBLIC_ACCESS',
            '^/api/(users|promotions|decrees|guild-members)' => 'ROLE_ELU',
            '^/api/(notes|appointments|municipal_events)' => 'ROLE_SECRETAIRE',
            '^/api' => 'ROLE_USER',
        ], $rules);
    }

    public function testSensitiveControllersDeclareTheSameRoleAsTheFirewall(): void
    {
        self::assertSame('ROLE_USER', $this->grantedRole(MeController::class));
        self::assertSame('ROLE_ELU', $this->grantedRole(GuildMemberController::class));
        self::assertSame('ROLE_ELU', $this->grantedRole(DecreePosterController::class));
        self::assertSame('ROLE_SECRETAIRE', $this->grantedRole(EventPosterController::class));
        self::assertNull($this->grantedRole(HealthController::class));
        self::assertNull($this->grantedRole(PublicBoardController::class));
        self::assertNull($this->grantedRole(DiscordAuthController::class));
    }

    public function testResourcesCannotBeWrittenByACitizen(): void
    {
        self::assertSame("is_granted('ROLE_ELU')", $this->resourceSecurity(Decree::class));
        self::assertSame("is_granted('ROLE_SECRETAIRE')", $this->resourceSecurity(Note::class));
        self::assertSame("is_granted('ROLE_SECRETAIRE')", $this->resourceSecurity(Appointment::class));
        self::assertSame("is_granted('ROLE_SECRETAIRE')", $this->resourceSecurity(MunicipalEvent::class));

        foreach ($this->operations(User::class) as $operation) {
            self::assertSame("is_granted('ROLE_ELU')", $operation->getSecurity());

            if (\in_array(strtoupper((string) $operation->getMethod()), ['PATCH', 'POST'], true)) {
                self::assertSame(JobAssignment::class, $operation->getInput());
            }
        }
    }

    private function grantedRole(string $class): ?string
    {
        $reflection = new \ReflectionClass($class);
        $attributes = $reflection->getAttributes(IsGranted::class);

        foreach ($reflection->getMethods(\ReflectionMethod::IS_PUBLIC) as $method) {
            if ($method->isConstructor()) {
                continue;
            }

            $attributes = [...$attributes, ...$method->getAttributes(IsGranted::class)];
        }

        if ([] === $attributes) {
            return null;
        }

        $role = $attributes[0]->newInstance()->attribute;

        return \is_string($role) ? $role : null;
    }

    private function resourceSecurity(string $class): ?string
    {
        $security = $this->resource($class)->getSecurity();

        return \is_string($security) ? $security : null;
    }

    /**
     * @return list<HttpOperation>
     */
    private function operations(string $class): array
    {
        $operations = $this->resource($class)->getOperations();
        if (null === $operations) {
            return [];
        }

        $http = [];
        foreach ($operations as $operation) {
            self::assertInstanceOf(HttpOperation::class, $operation);
            $http[] = $operation;
        }

        return $http;
    }

    private function resource(string $class): ApiResource
    {
        $attributes = (new \ReflectionClass($class))->getAttributes(ApiResource::class);
        self::assertCount(1, $attributes);

        $resource = $attributes[0]->newInstance();
        self::assertInstanceOf(ApiResource::class, $resource);

        return $resource;
    }
}
