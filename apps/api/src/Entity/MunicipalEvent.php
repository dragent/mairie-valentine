<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Something happening in town: a council meeting, a fair, a public hearing.
 */
#[ORM\Entity]
#[ORM\Table(name: 'municipal_events')]
#[ApiResource(
    shortName: 'MunicipalEvent',
    operations: [new GetCollection(), new Get(), new Post(), new Patch(), new Delete()],
    normalizationContext: ['groups' => ['event:read', 'authored:read']],
    denormalizationContext: ['groups' => ['event:write']],
    order: ['startsAt' => 'ASC'],
    paginationEnabled: false,
    security: "is_granted('ROLE_SECRETAIRE')",
)]
class MunicipalEvent implements AuthoredEntity
{
    use AuthoredEntityTrait;

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['event:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    #[Groups(['event:read', 'event:write'])]
    #[Assert\NotBlank(message: 'L\'intitulé de l\'événement est obligatoire.')]
    #[Assert\Length(max: 180, maxMessage: 'L\'intitulé ne peut dépasser {{ limit }} caractères.')]
    private string $title = '';

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['event:read', 'event:write'])]
    private ?string $description = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['event:read', 'event:write'])]
    #[Assert\NotNull(message: 'La date de début est obligatoire.')]
    private ?\DateTimeImmutable $startsAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    #[Groups(['event:read', 'event:write'])]
    #[Assert\GreaterThan(propertyPath: 'startsAt', message: 'La fin doit suivre le début.')]
    private ?\DateTimeImmutable $endsAt = null;

    #[ORM\Column(length: 180, nullable: true)]
    #[Groups(['event:read', 'event:write'])]
    #[Assert\Length(max: 180, maxMessage: 'Le lieu ne peut dépasser {{ limit }} caractères.')]
    private ?string $location = null;

    public function getId(): ?int
    {
        return $this->id;
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

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): self
    {
        $this->description = $description;

        return $this;
    }

    public function getStartsAt(): ?\DateTimeImmutable
    {
        return $this->startsAt;
    }

    public function setStartsAt(?\DateTimeImmutable $startsAt): self
    {
        $this->startsAt = $startsAt;

        return $this;
    }

    public function getEndsAt(): ?\DateTimeImmutable
    {
        return $this->endsAt;
    }

    public function setEndsAt(?\DateTimeImmutable $endsAt): self
    {
        $this->endsAt = $endsAt;

        return $this;
    }

    public function getLocation(): ?string
    {
        return $this->location;
    }

    public function setLocation(?string $location): self
    {
        $this->location = $location;

        return $this;
    }
}
