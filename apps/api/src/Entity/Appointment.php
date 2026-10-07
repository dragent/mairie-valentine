<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Enum\AppointmentStatus;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * An appointment booked at the front desk for a citizen.
 */
#[ORM\Entity]
#[ORM\Table(name: 'appointments')]
#[ApiResource(
    operations: [new GetCollection(), new Get(), new Post(), new Patch(), new Delete()],
    normalizationContext: ['groups' => ['appointment:read', 'authored:read']],
    denormalizationContext: ['groups' => ['appointment:write']],
    order: ['scheduledAt' => 'ASC'],
    paginationEnabled: false,
    security: "is_granted('ROLE_SECRETAIRE')",
)]
class Appointment implements AuthoredEntity
{
    use AuthoredEntityTrait;

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['appointment:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    #[Groups(['appointment:read', 'appointment:write'])]
    #[Assert\NotBlank(message: 'L\'objet du rendez-vous est obligatoire.')]
    #[Assert\Length(max: 180, maxMessage: 'L\'objet ne peut dépasser {{ limit }} caractères.')]
    private string $subject = '';

    #[ORM\Column(length: 120)]
    #[Groups(['appointment:read', 'appointment:write'])]
    #[Assert\NotBlank(message: 'Le nom du citoyen est obligatoire.')]
    #[Assert\Length(max: 120, maxMessage: 'Le nom ne peut dépasser {{ limit }} caractères.')]
    private string $citizenName = '';

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['appointment:read', 'appointment:write'])]
    #[Assert\NotNull(message: 'La date du rendez-vous est obligatoire.')]
    private ?\DateTimeImmutable $scheduledAt = null;

    #[ORM\Column]
    #[Groups(['appointment:read', 'appointment:write'])]
    #[Assert\Positive(message: 'La durée doit être d\'au moins une minute.')]
    #[Assert\LessThanOrEqual(value: 480, message: 'La durée ne peut dépasser une journée de travail.')]
    private int $durationMinutes = 30;

    #[ORM\Column(length: 180, nullable: true)]
    #[Groups(['appointment:read', 'appointment:write'])]
    #[Assert\Length(max: 180, maxMessage: 'Le lieu ne peut dépasser {{ limit }} caractères.')]
    private ?string $location = null;

    #[ORM\Column(length: 16, enumType: AppointmentStatus::class)]
    #[Groups(['appointment:read', 'appointment:write'])]
    private AppointmentStatus $status = AppointmentStatus::SCHEDULED;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['appointment:read', 'appointment:write'])]
    private ?string $notes = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getSubject(): string
    {
        return $this->subject;
    }

    public function setSubject(string $subject): self
    {
        $this->subject = $subject;

        return $this;
    }

    public function getCitizenName(): string
    {
        return $this->citizenName;
    }

    public function setCitizenName(string $citizenName): self
    {
        $this->citizenName = $citizenName;

        return $this;
    }

    public function getScheduledAt(): ?\DateTimeImmutable
    {
        return $this->scheduledAt;
    }

    public function setScheduledAt(?\DateTimeImmutable $scheduledAt): self
    {
        $this->scheduledAt = $scheduledAt;

        return $this;
    }

    public function getDurationMinutes(): int
    {
        return $this->durationMinutes;
    }

    public function setDurationMinutes(int $durationMinutes): self
    {
        $this->durationMinutes = $durationMinutes;

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

    public function getStatus(): AppointmentStatus
    {
        return $this->status;
    }

    public function setStatus(AppointmentStatus $status): self
    {
        $this->status = $status;

        return $this;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): self
    {
        $this->notes = $notes;

        return $this;
    }
}
