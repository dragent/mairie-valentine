<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Enum\DecreeStatus;
use App\Repository\DecreeRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * A municipal decree. Reserved to the elected officials: the secretary may read
 * nothing of it.
 */
#[ORM\Entity(repositoryClass: DecreeRepository::class)]
#[ORM\Table(name: 'decrees')]
#[ApiResource(
    operations: [new GetCollection(), new Get(), new Post(), new Patch(), new Delete()],
    normalizationContext: ['groups' => ['decree:read', 'authored:read']],
    denormalizationContext: ['groups' => ['decree:write']],
    order: ['createdAt' => 'DESC'],
    paginationEnabled: false,
    security: "is_granted('ROLE_ELU')",
)]
class Decree implements AuthoredEntity
{
    use AuthoredEntityTrait;

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['decree:read'])]
    private ?int $id = null;

    /**
     * Allocated by {@see \App\Doctrine\DecreeReferenceListener} when the decree
     * is first persisted, so that the numbering cannot be chosen by hand.
     */
    #[ORM\Column(length: 32, unique: true)]
    #[Groups(['decree:read'])]
    private ?string $reference = null;

    #[ORM\Column(length: 180)]
    #[Groups(['decree:read', 'decree:write'])]
    #[Assert\NotBlank(message: 'L\'intitulé du décret est obligatoire.')]
    #[Assert\Length(max: 180, maxMessage: 'L\'intitulé ne peut dépasser {{ limit }} caractères.')]
    private string $title = '';

    #[ORM\Column(type: Types::TEXT)]
    #[Groups(['decree:read', 'decree:write'])]
    #[Assert\NotBlank(message: 'Le texte du décret est obligatoire.')]
    private string $body = '';

    #[ORM\Column(length: 16, enumType: DecreeStatus::class)]
    #[Groups(['decree:read', 'decree:write'])]
    private DecreeStatus $status = DecreeStatus::DRAFT;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    #[Groups(['decree:read'])]
    private ?\DateTimeImmutable $publishedAt = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getReference(): ?string
    {
        return $this->reference;
    }

    public function setReference(string $reference): self
    {
        $this->reference = $reference;

        return $this;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): self
    {
        $this->title = $title;

        return $this;
    }

    public function getBody(): string
    {
        return $this->body;
    }

    public function setBody(string $body): self
    {
        $this->body = $body;

        return $this;
    }

    public function getStatus(): DecreeStatus
    {
        return $this->status;
    }

    public function setStatus(DecreeStatus $status): self
    {
        $this->status = $status;

        // Publication is dated once and for all; repealing does not erase it.
        if (DecreeStatus::PUBLISHED === $status && null === $this->publishedAt) {
            $this->publishedAt = new \DateTimeImmutable();
        }

        return $this;
    }

    public function getPublishedAt(): ?\DateTimeImmutable
    {
        return $this->publishedAt;
    }
}
