<?php

declare(strict_types=1);

namespace App\Tests\Security;

use App\Entity\User;
use App\Enum\Job;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Dotenv\Dotenv;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Boots the Symfony kernel and sends real HTTP requests through the firewall.
 * A YAML rule or a mocked voter is not a substitute for these responses.
 *
 * The schema is created only on the dedicated database mairie_http_test.
 * Set HTTP_AUTHORIZATION_TESTS=1 when that database is reachable.
 */
final class HttpAuthorizationTest extends KernelTestCase
{
    private const DEDICATED_DATABASE = 'mairie_http_test';

    private static bool $ready = false;

    /** @var array<string, string> */
    private static array $tokens = [];

    protected function setUp(): void
    {
        if ('1' !== $this->flag()) {
            self::markTestSkipped('Set HTTP_AUTHORIZATION_TESTS=1 to boot Symfony against '.self::DEDICATED_DATABASE.'.');
        }

        parent::setUp();

        if (!self::$ready) {
            $this->bootApplication();
            self::$ready = true;
        }
    }

    public function testAnonymousRequestsStayOnPublicRoutes(): void
    {
        self::assertSame(200, $this->httpStatus('GET', '/health'));
        self::assertSame(200, $this->httpStatus('GET', '/api/public/board'));
        self::assertSame(401, $this->httpStatus('GET', '/api/notes'));
        self::assertSame(401, $this->httpStatus('GET', '/api/me'));
    }

    public function testACitizenCannotReachStaffOrElectedRoutes(): void
    {
        $token = self::$tokens['citizen'];

        self::assertSame(200, $this->httpStatus('GET', '/api/me', $token));
        self::assertSame(403, $this->httpStatus('GET', '/api/notes', $token));
        self::assertSame(403, $this->httpStatus('POST', '/api/notes', $token, $this->noteBody()));
        self::assertSame(403, $this->httpStatus('GET', '/api/decrees', $token));
        self::assertSame(403, $this->httpStatus('GET', '/api/users', $token));
        self::assertSame(403, $this->httpStatus('POST', '/api/promotions', $token, $this->promotion('201', 'secretaire')));
        self::assertSame(403, $this->httpStatus('POST', '/api/decrees/1/poster', $token));
        self::assertSame(403, $this->httpStatus('POST', '/api/municipal_events/1/poster', $token));
    }

    public function testASecretaryWorksTheDeskButCannotTouchDecreesOrPromotions(): void
    {
        $token = self::$tokens['secretary'];

        self::assertSame(200, $this->httpStatus('GET', '/api/notes', $token));
        self::assertSame(201, $this->httpStatus('POST', '/api/notes', $token, $this->noteBody()));
        self::assertSame(403, $this->httpStatus('GET', '/api/decrees', $token));
        self::assertSame(403, $this->httpStatus('GET', '/api/users', $token));
        self::assertSame(403, $this->httpStatus('POST', '/api/promotions', $token, $this->promotion('201', 'secretaire')));
        self::assertSame(403, $this->httpStatus('POST', '/api/decrees/1/poster', $token));
        self::assertNotSame(403, $this->httpStatus('POST', '/api/municipal_events/1/poster', $token));
    }

    public function testADeputyReadsDecreesAndRecruitsOnlySecretaries(): void
    {
        $token = self::$tokens['deputy'];

        self::assertSame(200, $this->httpStatus('GET', '/api/decrees', $token));
        self::assertSame(200, $this->httpStatus('GET', '/api/notes', $token));
        self::assertSame(200, $this->httpStatus('GET', '/api/users', $token));
        self::assertSame(200, $this->httpStatus('POST', '/api/promotions', $token, $this->promotion('201', 'secretaire')));
        self::assertSame(403, $this->httpStatus('POST', '/api/promotions', $token, $this->promotion('202', 'adjoint')));
        self::assertSame(403, $this->httpStatus('POST', '/api/promotions', $token, $this->promotion('102', 'secretaire')));
        self::assertNotSame(403, $this->httpStatus('POST', '/api/decrees/1/poster', $token));
    }

    public function testAMayorPromotesOthersButNotHimself(): void
    {
        $token = self::$tokens['mayor'];

        self::assertSame(403, $this->httpStatus('POST', '/api/promotions', $token, $this->promotion('103', 'adjoint')));
        self::assertSame(200, $this->httpStatus('POST', '/api/promotions', $token, $this->promotion('202', 'adjoint')));
        self::assertSame(200, $this->httpStatus('GET', '/api/decrees', $token));
    }

    public function testAnAdministratorInheritsTheMayorsPowers(): void
    {
        $token = self::$tokens['admin'];

        self::assertSame(200, $this->httpStatus('GET', '/api/users', $token));
        self::assertSame(200, $this->httpStatus('GET', '/api/decrees', $token));
        self::assertSame(200, $this->httpStatus('POST', '/api/promotions', $token, $this->promotion('203', 'adjoint')));
        self::assertSame(403, $this->httpStatus('POST', '/api/promotions', $token, $this->promotion('104', 'maire')));
    }

    private function bootApplication(): void
    {
        $_SERVER['APP_ENV'] = $_ENV['APP_ENV'] = 'test';
        putenv('APP_ENV=test');

        (new Dotenv())->bootEnv(\dirname(__DIR__, 2).'/.env');

        $_SERVER['APP_SECRET'] = $_ENV['APP_SECRET'] = '$ecretf0rt3st';
        putenv('APP_SECRET=$ecretf0rt3st');

        $this->useDedicatedDatabase();
        $this->useEphemeralJwtKeys();
        foreach (['DISCORD_GUILD_ID', 'DISCORD_BOT_TOKEN', 'DISCORD_ROLE_MAIRE', 'DISCORD_ROLE_ADJOINT', 'DISCORD_ROLE_SECRETAIRE'] as $name) {
            $_SERVER[$name] = $_ENV[$name] = '';
            putenv($name.'=');
        }
        foreach (['DISCORD_CLIENT_ID' => 'http-test', 'DISCORD_CLIENT_SECRET' => 'http-test'] as $name => $value) {
            if ('' === (string) ($_SERVER[$name] ?? $_ENV[$name] ?? '')) {
                $_SERVER[$name] = $_ENV[$name] = $value;
                putenv($name.'='.$value);
            }
        }

        $kernel = self::bootKernel();
        $container = static::getContainer();
        /** @var EntityManagerInterface $entities */
        $entities = $container->get('doctrine')->getManager();
        $connection = $entities->getConnection();
        $connection->executeQuery('SELECT 1');

        $name = (string) ($connection->getParams()['dbname'] ?? '');
        if (self::DEDICATED_DATABASE !== $name) {
            self::fail('Refusing to create the schema on "'.$name.'".');
        }

        $metadata = $entities->getMetadataFactory()->getAllMetadata();
        $schema = new SchemaTool($entities);
        if ([] !== $connection->createSchemaManager()->listTableNames()) {
            $schema->dropSchema($metadata);
        }
        $schema->createSchema($metadata);

        $citizen = new User('100', 'citoyen');
        $secretary = new User('101', 'secretaire');
        $secretary->setJob(Job::SECRETAIRE);
        $deputy = new User('102', 'adjoint');
        $deputy->setJob(Job::ADJOINT);
        $mayor = new User('103', 'maire');
        $mayor->setJob(Job::MAIRE);
        $admin = new User('104', 'admin');
        $admin->setRoles([User::ROLE_ADMIN]);
        $recruit = new User('201', 'recrue');
        $futureDeputy = new User('202', 'future-adjoint');
        $adminChoice = new User('203', 'choix-admin');

        foreach ([$citizen, $secretary, $deputy, $mayor, $admin, $recruit, $futureDeputy, $adminChoice] as $user) {
            $entities->persist($user);
        }
        $entities->flush();

        /** @var JWTTokenManagerInterface $jwt */
        $jwt = $container->get(JWTTokenManagerInterface::class);
        self::$tokens = [
            'citizen' => $jwt->create($citizen),
            'secretary' => $jwt->create($secretary),
            'deputy' => $jwt->create($deputy),
            'mayor' => $jwt->create($mayor),
            'admin' => $jwt->create($admin),
        ];

        self::ensureKernelShutdown();
        unset($kernel);
    }

    private function useDedicatedDatabase(): void
    {
        $current = $_SERVER['DATABASE_URL'] ?? $_ENV['DATABASE_URL'] ?? '';
        if (!\is_string($current) || '' === $current) {
            self::fail('DATABASE_URL is required when HTTP_AUTHORIZATION_TESTS=1.');
        }

        $parts = parse_url($current);
        if (!\is_array($parts) || !isset($parts['scheme'], $parts['host'])) {
            self::fail('DATABASE_URL could not be rewritten for the HTTP test database.');
        }

        // Doctrine's test configuration appends _test to this name.
        $path = '/mairie_http';
        $auth = '';
        if (isset($parts['user'])) {
            $auth = rawurlencode(rawurldecode((string) $parts['user']));
            if (isset($parts['pass'])) {
                $auth .= ':'.rawurlencode(rawurldecode((string) $parts['pass']));
            }
            $auth .= '@';
        }
        $port = isset($parts['port']) ? ':'.$parts['port'] : '';
        $query = isset($parts['query']) ? '?'.$parts['query'] : '';
        $rewritten = \sprintf('%s://%s%s%s%s%s', $parts['scheme'], $auth, $parts['host'], $port, $path, $query);

        $_SERVER['DATABASE_URL'] = $_ENV['DATABASE_URL'] = $rewritten;
        putenv('DATABASE_URL='.$rewritten);
    }

    private function useEphemeralJwtKeys(): void
    {
        $directory = \dirname(__DIR__, 2).'/var/http-jwt';
        if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
            self::fail('Cannot create the ephemeral JWT directory.');
        }

        $private = $directory.'/private.pem';
        $public = $directory.'/public.pem';
        $passphrase = 'http-test';

        if (!is_file($private) || !is_file($public)) {
            $key = openssl_pkey_new([
                'private_key_bits' => 2048,
                'private_key_type' => OPENSSL_KEYTYPE_RSA,
            ]);
            if (false === $key) {
                self::fail('Cannot generate an ephemeral JWT key.');
            }
            $exported = '';
            if (!openssl_pkey_export($key, $exported, $passphrase)) {
                self::fail('Cannot export the ephemeral JWT key.');
            }
            $details = openssl_pkey_get_details($key);
            if (!\is_array($details) || !isset($details['key'])) {
                self::fail('Cannot read the ephemeral JWT public key.');
            }
            file_put_contents($private, $exported);
            file_put_contents($public, $details['key']);
            chmod($private, 0600);
            chmod($public, 0600);
        }

        $_SERVER['JWT_SECRET_KEY'] = $_ENV['JWT_SECRET_KEY'] = $private;
        $_SERVER['JWT_PUBLIC_KEY'] = $_ENV['JWT_PUBLIC_KEY'] = $public;
        $_SERVER['JWT_PASSPHRASE'] = $_ENV['JWT_PASSPHRASE'] = $passphrase;
        putenv('JWT_SECRET_KEY='.$private);
        putenv('JWT_PUBLIC_KEY='.$public);
        putenv('JWT_PASSPHRASE='.$passphrase);
    }

    private function httpStatus(string $method, string $uri, ?string $token = null, ?string $body = null): int
    {
        return $this->response($method, $uri, $token, $body)->getStatusCode();
    }

    private function response(string $method, string $uri, ?string $token, ?string $body): Response
    {
        self::ensureKernelShutdown();
        $kernel = self::bootKernel();
        $server = [
            'HTTP_ACCEPT' => 'application/json',
            'CONTENT_TYPE' => 'application/json',
            'HTTP_HOST' => 'localhost',
        ];
        if (null !== $token) {
            $server['HTTP_AUTHORIZATION'] = 'Bearer '.$token;
        }

        $request = Request::create($uri, $method, [], [], [], $server, $body);
        if (null !== $token) {
            $request->headers->set('Authorization', 'Bearer '.$token);
        }
        if (null !== $body) {
            $request->headers->set('Content-Type', 'application/json');
        }

        try {
            $response = $kernel->handle($request);
            $kernel->terminate($request, $response);
        } finally {
            self::ensureKernelShutdown();
        }

        return $response;
    }

    private function noteBody(): string
    {
        return '{"title":"Note de test","body":"Texte de la note."}';
    }

    private function promotion(string $discordId, string $job): string
    {
        return '{"discordId":"'.$discordId.'","job":"'.$job.'"}';
    }

    private function flag(): string
    {
        $value = $_SERVER['HTTP_AUTHORIZATION_TESTS'] ?? $_ENV['HTTP_AUTHORIZATION_TESTS'] ?? getenv('HTTP_AUTHORIZATION_TESTS');

        return \is_string($value) ? $value : '';
    }
}
