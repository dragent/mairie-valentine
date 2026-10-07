<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Decree;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Decree>
 */
class DecreeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Decree::class);
    }

    /**
     * Decrees are numbered per year, as they are on the notice board. Two
     * simultaneous creations would ask for the same number: the unique index on
     * the column is what keeps the register honest.
     */
    public function nextReference(\DateTimeImmutable $on): string
    {
        $year = $on->format('Y');

        $taken = (int) $this->createQueryBuilder('d')
            ->select('COUNT(d.id)')
            ->andWhere('d.reference LIKE :prefix')
            ->setParameter('prefix', \sprintf('DEC-%s-%%', $year))
            ->getQuery()
            ->getSingleScalarResult();

        return \sprintf('DEC-%s-%03d', $year, $taken + 1);
    }
}
