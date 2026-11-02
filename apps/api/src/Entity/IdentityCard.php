<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\State\CloseIdentityCardRegisterProcessor;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

/**
 * One identity card issued since the last mayors' meeting.
 *
 * The holder is never named: the register is a tally, wiped when the mayor or
 * the deputy mayor closes it after the meeting.
 */
#[ORM\Entity]
#[ORM\Table(name: 'identity_cards')]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Post(),
        new Post(
            uriTemplate: '/identity_cards/close',
            status: 204,
            processor: CloseIdentityCardRegisterProcessor::class,
            input: false,
            output: false,
            read: false,
        ),
    ],
    normalizationContext: ['groups' => ['identity_card:read', 'authored:read']],
    denormalizationContext: ['groups' => ['identity_card:write']],
    order: ['createdAt' => 'DESC'],
    paginationEnabled: false,
    security: "is_granted('ROLE_ELU')",
)]
class IdentityCard implements AuthoredEntity
{
    use AuthoredEntityTrait;

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['identity_card:read'])]
    private ?int $id = null;

    public function getId(): ?int
    {
        return $this->id;
    }
}
