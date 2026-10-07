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
use Symfony\Component\Validator\Context\ExecutionContextInterface;

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

    /**
     * Chosen when the decree is published. A draft carries none. Once the
     * period has ended the decree is repealed, and these dates stay.
     */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    #[Groups(['decree:read', 'decree:write'])]
    private ?\DateTimeImmutable $startsAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    #[Groups(['decree:read', 'decree:write'])]
    private ?\DateTimeImmutable $endsAt = null;

    /**
     * Public path under public/uploads. The client never chooses it.
     */
    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['decree:read'])]
    private ?string $posterPath = null;

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

        return $this;
    }

    /**
     * The last day is still in force. The next morning, the decree is repealed.
     */
    public function repealIfThePeriodHasEnded(\DateTimeImmutable $today): void
    {
        if (DecreeStatus::PUBLISHED !== $this->status || null === $this->endsAt) {
            return;
        }

        $zone = $today->getTimezone();

        if ($this->endsAt->setTimezone($zone)->format('Y-m-d') < $today->format('Y-m-d')) {
            $this->status = DecreeStatus::REPEALED;
        }
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

    public function getPosterPath(): ?string
    {
        return $this->posterPath;
    }

    public function setPosterPath(?string $posterPath): self
    {
        $this->posterPath = $posterPath;

        return $this;
    }

    #[Assert\Callback]
    public function validatePeriod(ExecutionContextInterface $context): void
    {
        $hasDates = null !== $this->startsAt || null !== $this->endsAt;

        if (DecreeStatus::DRAFT === $this->status && $hasDates) {
            $context->buildViolation('Un brouillon ne porte pas de date.')->addViolation();

            return;
        }

        if (DecreeStatus::REPEALED === $this->status && $hasDates) {
            $context->buildViolation('Un décret abrogé ne porte pas de date.')->addViolation();

            return;
        }

        if (DecreeStatus::PUBLISHED !== $this->status) {
            return;
        }

        if (null === $this->startsAt || null === $this->endsAt) {
            $context->buildViolation('Indiquez la date de début et la date de fin.')->addViolation();

            return;
        }

        if ($this->endsAt < $this->startsAt) {
            $context->buildViolation('La date de fin ne peut précéder la date de début.')->addViolation();
        }
    }
}
