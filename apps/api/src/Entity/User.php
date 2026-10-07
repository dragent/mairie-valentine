<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Dto\JobAssignment;
use App\Enum\Job;
use App\Repository\UserRepository;
use App\State\AssignJobProcessor;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Serializer\Attribute\Groups;

/**
 * An account, always backed by a Discord one.
 *
 * The elected officials may browse the register of accounts. The mayor hands
 * out any position and the deputy mayor recruits secretaries, both through
 * {@see JobAssignment} rather than by writing the column directly, because the
 * Discord roles have to follow.
 */
#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: 'users')]
#[ApiResource(
    operations: [
        new GetCollection(security: "is_granted('ROLE_ELU')"),
        new Get(security: "is_granted('ROLE_ELU')"),
        new Patch(
            security: "is_granted('ROLE_ELU')",
            input: JobAssignment::class,
            processor: AssignJobProcessor::class,
        ),
        new Post(
            uriTemplate: '/promotions',
            status: 200,
            security: "is_granted('ROLE_ELU')",
            input: JobAssignment::class,
            output: User::class,
            processor: AssignJobProcessor::class,
            read: false,
        ),
    ],
    normalizationContext: ['groups' => ['user:read']],
    order: ['username' => 'ASC'],
    paginationEnabled: false,
)]
class User implements UserInterface
{
    public const ROLE_USER = 'ROLE_USER';
    public const ROLE_SECRETAIRE = 'ROLE_SECRETAIRE';
    public const ROLE_ELU = 'ROLE_ELU';
    public const ROLE_MAIRE = 'ROLE_MAIRE';
    public const ROLE_ADMIN = 'ROLE_ADMIN';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['user:read'])]
    private ?int $id = null;

    /**
     * Discord snowflake. Immutable, unlike the username, so it is what we use
     * as the user identifier everywhere.
     */
    #[ORM\Column(length: 32, unique: true)]
    #[Groups(['user:read'])]
    private string $discordId;

    #[ORM\Column(length: 64)]
    #[Groups(['user:read'])]
    private string $username;

    #[ORM\Column(length: 64, nullable: true)]
    #[Groups(['user:read'])]
    private ?string $displayName = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $email = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['user:read'])]
    private ?string $avatarUrl = null;

    /**
     * Only holds roles that no position grants, i.e. ROLE_ADMIN. The ones tied
     * to the town hall position are derived from {@see self::$job}.
     *
     * @var list<string>
     */
    #[ORM\Column]
    private array $roles = [];

    #[ORM\Column(length: 16, enumType: Job::class, nullable: true)]
    #[Groups(['user:read'])]
    private ?Job $job = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    #[Groups(['user:read'])]
    private ?\DateTimeImmutable $lastLoginAt = null;

    public function __construct(string $discordId, string $username)
    {
        $this->discordId = $discordId;
        $this->username = $username;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getDiscordId(): string
    {
        return $this->discordId;
    }

    public function getUserIdentifier(): string
    {
        return $this->discordId;
    }

    public function getUsername(): string
    {
        return $this->username;
    }

    public function setUsername(string $username): self
    {
        $this->username = $username;

        return $this;
    }

    public function getDisplayName(): ?string
    {
        return $this->displayName;
    }

    public function setDisplayName(?string $displayName): self
    {
        $this->displayName = $displayName;

        return $this;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(?string $email): self
    {
        $this->email = $email;

        return $this;
    }

    public function getAvatarUrl(): ?string
    {
        return $this->avatarUrl;
    }

    public function setAvatarUrl(?string $avatarUrl): self
    {
        $this->avatarUrl = $avatarUrl;

        return $this;
    }

    /**
     * @return list<string>
     */
    public function getRoles(): array
    {
        $jobRoles = $this->job?->roles() ?? [];

        return array_values(array_unique([...$this->roles, ...$jobRoles, self::ROLE_USER]));
    }

    /**
     * @param list<string> $roles
     */
    public function setRoles(array $roles): self
    {
        $this->roles = array_values(array_filter($roles, static fn (string $role): bool => self::ROLE_USER !== $role));

        return $this;
    }

    public function getJob(): ?Job
    {
        return $this->job ?? $this->positionGrantedByStoredRoles();
    }

    public function setJob(?Job $job): self
    {
        $this->job = $job;
        // A hand-filled role must not resurrect a position once it is recorded
        // or withdrawn. ROLE_ADMIN is the only extra role that stays.
        $this->roles = array_values(array_filter(
            $this->roles,
            static fn (string $role): bool => !\in_array($role, [self::ROLE_MAIRE, self::ROLE_ELU, self::ROLE_SECRETAIRE], true),
        ));

        return $this;
    }

    /**
     * The position column is the register. A role kept in the extra-roles
     * column still names a position when that column was filled in by hand
     * and the register was left empty.
     */
    private function positionGrantedByStoredRoles(): ?Job
    {
        foreach ([Job::MAIRE, Job::ADJOINT, Job::SECRETAIRE] as $position) {
            foreach ($position->roles() as $role) {
                if (\in_array($role, $this->roles, true)) {
                    return $position;
                }
            }
        }

        return null;
    }

    #[Groups(['user:read'])]
    public function getJobLabel(): ?string
    {
        return $this->getJob()?->label();
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getLastLoginAt(): ?\DateTimeImmutable
    {
        return $this->lastLoginAt;
    }

    public function touchLastLogin(): self
    {
        $this->lastLoginAt = new \DateTimeImmutable();

        return $this;
    }

    public function eraseCredentials(): void
    {
        // No credential is ever stored: authentication is delegated to Discord.
    }
}
