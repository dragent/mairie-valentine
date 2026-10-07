<?php

declare(strict_types=1);

namespace App\Tests\Entity;

use App\Entity\Decree;
use App\Enum\DecreeStatus;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Validator\Validation;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class DecreeTest extends TestCase
{
    public function testADraftCarriesNoDates(): void
    {
        $decree = $this->decree();
        $decree->setStatus(DecreeStatus::DRAFT);
        $decree->setStartsAt(new \DateTimeImmutable('1889-10-07'));

        self::assertSame(
            ['Un brouillon ne porte pas de date.'],
            $this->messages($decree),
        );
    }

    public function testPublishingRequiresAStartAndAnEnd(): void
    {
        $decree = $this->decree();
        $decree->setStatus(DecreeStatus::PUBLISHED);

        self::assertSame(
            ['Indiquez la date de début et la date de fin.'],
            $this->messages($decree),
        );
    }

    public function testTheEndCannotPrecedeTheStart(): void
    {
        $decree = $this->decree();
        $decree->setStatus(DecreeStatus::PUBLISHED);
        $decree->setStartsAt(new \DateTimeImmutable('1889-10-09'));
        $decree->setEndsAt(new \DateTimeImmutable('1889-10-07'));

        self::assertSame(
            ['La date de fin ne peut précéder la date de début.'],
            $this->messages($decree),
        );
    }

    public function testAPublicationMayCoverASingleDay(): void
    {
        $day = new \DateTimeImmutable('1889-10-07');
        $decree = $this->decree();
        $decree->setStatus(DecreeStatus::PUBLISHED);
        $decree->setStartsAt($day);
        $decree->setEndsAt($day);

        self::assertSame([], $this->messages($decree));
    }

    public function testAPublicationStaysInForceThroughItsLastDay(): void
    {
        $decree = $this->published('1889-10-01', '1889-10-07');

        $decree->repealIfThePeriodHasEnded(new \DateTimeImmutable('1889-10-07'));

        self::assertSame(DecreeStatus::PUBLISHED, $decree->getStatus());
    }

    public function testAPublicationIsRepealedTheDayAfterItEnds(): void
    {
        $decree = $this->published('1889-10-01', '1889-10-07');

        $decree->repealIfThePeriodHasEnded(new \DateTimeImmutable('1889-10-08'));

        self::assertSame(DecreeStatus::REPEALED, $decree->getStatus());
    }

    public function testADraftIsNotRepealedByThePassingOfTime(): void
    {
        $decree = $this->decree();
        $decree->setStatus(DecreeStatus::DRAFT);

        $decree->repealIfThePeriodHasEnded(new \DateTimeImmutable('1890-01-01'));

        self::assertSame(DecreeStatus::DRAFT, $decree->getStatus());
    }

    public function testARepealedDecreeCarriesNoDates(): void
    {
        $decree = $this->decree();
        $decree->setStatus(DecreeStatus::REPEALED);
        $decree->setStartsAt(new \DateTimeImmutable('1889-10-07'));
        $decree->setEndsAt(new \DateTimeImmutable('1889-10-09'));

        self::assertSame(
            ['Un décret abrogé ne porte pas de date.'],
            $this->messages($decree),
        );
    }

    private function decree(): Decree
    {
        $decree = new Decree();
        $decree->setTitle('Arrêté');
        $decree->setBody('Texte');

        return $decree;
    }

    private function published(string $start, string $end): Decree
    {
        $decree = $this->decree();
        $decree->setStatus(DecreeStatus::PUBLISHED);
        $decree->setStartsAt(new \DateTimeImmutable($start));
        $decree->setEndsAt(new \DateTimeImmutable($end));

        return $decree;
    }

    /**
     * @return list<string>
     */
    private function messages(Decree $decree): array
    {
        return array_map(
            static fn ($violation) => (string) $violation->getMessage(),
            iterator_to_array($this->validator()->validate($decree)),
        );
    }

    private function validator(): ValidatorInterface
    {
        return Validation::createValidatorBuilder()
            ->enableAttributeMapping()
            ->getValidator();
    }
}
