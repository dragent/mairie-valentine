<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Enum\NoteStatus;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Free-form memo kept by the town hall staff.
 */
#[ORM\Entity]
#[ORM\Table(name: 'notes')]
#[ApiResource(
    operations: [new GetCollection(), new Get(), new Post(), new Patch(), new Delete()],
    normalizationContext: ['groups' => ['note:read', 'authored:read']],
    denormalizationContext: ['groups' => ['note:write']],
    order: ['updatedAt' => 'DESC'],
    paginationEnabled: false,
    security: "is_granted('ROLE_SECRETAIRE')",
)]
class Note implements AuthoredEntity
{
    use AuthoredEntityTrait;

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['note:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    #[Groups(['note:read', 'note:write'])]
    #[Assert\NotBlank(message: 'Le titre de la note est obligatoire.')]
    #[Assert\Length(max: 180, maxMessage: 'Le titre ne peut dépasser {{ limit }} caractères.')]
    private string $title = '';

    #[ORM\Column(type: Types::TEXT)]
    #[Groups(['note:read', 'note:write'])]
    #[Assert\NotBlank(message: 'Une note vide ne sert à rien.')]
    private string $body = '';

    #[ORM\Column(length: 16, enumType: NoteStatus::class, options: ['default' => 'current'])]
    #[Groups(['note:read', 'note:write'])]
    private NoteStatus $status = NoteStatus::CURRENT;

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

    public function getBody(): string
    {
        return $this->body;
    }

    public function setBody(string $body): self
    {
        $this->body = $body;

        return $this;
    }

    public function getStatus(): NoteStatus
    {
        return $this->status;
    }

    public function setStatus(NoteStatus $status): self
    {
        $this->status = $status;

        return $this;
    }
}
